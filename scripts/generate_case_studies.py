#!/usr/bin/env python3
import json
import re
from copy import deepcopy
from html import unescape
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString, Tag


ROOT = Path("/Users/piyushsharma/Downloads/FINAL CODE")
SOURCE_DIR = ROOT / ".case-study-source"
TEMPLATE_PATH = ROOT / "Indegene Revitalizes.html"
CASESTUDY_INDEX = ROOT / "casestudy.html"


def slugify(text: str) -> str:
    text = unescape(text).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    text = re.sub(r"-{2,}", "-", text)
    return text[:88].rstrip("-")


def text_content(node: Tag) -> str:
    return " ".join(node.get_text(" ", strip=True).split())


def first_sentence_or_paragraph(soup: BeautifulSoup) -> str:
    for p in soup.select(".l_content p"):
        text = text_content(p)
        if text:
            if "." in text:
                first_sentence = text.split(".", 1)[0].strip()
                if first_sentence:
                    return first_sentence + "."
            return text
    return ""


def clean_fragment(fragment_html: str) -> BeautifulSoup:
    frag = BeautifulSoup(fragment_html, "html.parser")

    for wrapper in frag.select(".case_study_inn"):
        wrapper.unwrap()

    h4_index = 0
    for h4 in frag.find_all("h4"):
        h4.name = "h2"
        h4["style"] = "margin-top:32px;" if h4_index else ""
        if not h4["style"]:
            del h4["style"]
        h4_index += 1

    for ul in frag.find_all("ul"):
        ul["style"] = "font-size:14.5px;color:var(--ink-70);line-height:1.85;padding-left:20px;margin-bottom:0;"

    for li in frag.find_all("li"):
        if li.parent and li.parent.name == "ul":
            li["style"] = "margin-bottom:8px;"

    for img in frag.find_all("img"):
        img["loading"] = "lazy"
        img["decoding"] = "async"
        if not img.get("alt"):
            img["alt"] = "Case study supporting image"

    for tag in frag.find_all(True):
        classes = [c for c in tag.get("class", []) if c not in {"pt-3", "pb-5"}]
        if classes:
            tag["class"] = classes
        elif tag.has_attr("class"):
            del tag["class"]

    return frag


def build_article_block(inner_html: str) -> Tag:
    article = BeautifulSoup('<div class="oco-article js-reveal"></div>', "html.parser").div
    frag = clean_fragment(inner_html)
    for child in list(frag.contents):
        article.append(child)
    return article


def build_stats_block(title: str, stats: list[tuple[str, str]]) -> Tag:
    soup = BeautifulSoup(
        """
        <div class="oco-outcomes-stats js-reveal">
          <p class="oco-outcomes-stats__title"></p>
          <div class="row g-0 text-center"></div>
        </div>
        """,
        "html.parser",
    )
    soup.select_one(".oco-outcomes-stats__title").string = title
    row = soup.select_one(".row")
    for value, label in stats[:3]:
        col = BeautifulSoup(
            """
            <div class="col-12 col-md-4 oco-stat-col">
              <div class="oco-stat-col__num"></div>
              <div class="oco-stat-col__text"></div>
            </div>
            """,
            "html.parser",
        ).div
        num_node = col.select_one(".oco-stat-col__num")
        text_node = col.select_one(".oco-stat-col__text")
        num_node.clear()
        num_node.append(NavigableString(value))
        text_node.string = label
        row.append(col)
    return soup.div


def build_image_block(images: list[Tag]) -> Tag:
    wrapper = BeautifulSoup('<div class="js-reveal"></div>', "html.parser").div
    for img in images:
        img_copy = deepcopy(img)
        img_copy["loading"] = "lazy"
        img_copy["decoding"] = "async"
        if not img_copy.get("alt"):
            img_copy["alt"] = "Case study supporting image"
        block = BeautifulSoup('<div class="oco-inner-img js-reveal"></div>', "html.parser").div
        block.append(img_copy)
        wrapper.append(block)
    return wrapper


def extract_case_data(source_path: Path) -> dict:
    soup = BeautifulSoup(source_path.read_text(), "html.parser")

    title = text_content(soup.find("h1"))
    description = first_sentence_or_paragraph(soup)

    first_content = soup.select_one("section.page_content.pb-1")
    left = first_content.select_one(".l_content")
    right = first_content.select_one(".r_content")

    hero_img = None
    image_wrapper = left.find("div", class_="pb-5")
    if image_wrapper and image_wrapper.find("img"):
        hero_img = deepcopy(image_wrapper.find("img"))
        hero_img["loading"] = "lazy"
        hero_img["decoding"] = "async"
        if not hero_img.get("alt"):
            hero_img["alt"] = "Case study hero image"
        image_wrapper.decompose()

    main_inner = "".join(str(child) for child in left.contents if isinstance(child, (Tag, NavigableString)) and str(child).strip())

    related = []
    for a in right.select(".case_study_colwidth a"):
        related.append((a.get("href", ""), text_content(a)))

    extra_sections = []
    for sec in soup.select("section.page_content.our_services"):
        content_col = sec.select_one(".row.top .l_content")
        if content_col:
            section_html = "".join(str(child) for child in content_col.contents if isinstance(child, (Tag, NavigableString)) and str(child).strip())
            if section_html:
                extra_sections.append(("article", section_html))

        stats = []
        for box in sec.select(".three-column-section .column-box"):
            value = text_content(box.select_one(".column-title"))
            label = text_content(box.select_one(".column-text"))
            if value and label:
                stats.append((value, label))
        if stats:
            stats_title = "Key Results"
            heading = sec.select_one(".row.top .l_content h4")
            if heading:
                stats_title = text_content(heading)
            extra_sections.append(("stats", (stats_title, stats)))

        standalone_images = []
        for img in sec.select("img"):
            if img.find_parent(class_="column-box"):
                continue
            standalone_images.append(deepcopy(img))
        if standalone_images:
            extra_sections.append(("images", standalone_images))

    return {
        "title": title,
        "description": description,
        "hero_img": hero_img,
        "main_inner": main_inner,
        "related": related,
        "extra_sections": extra_sections,
    }


def update_meta(soup: BeautifulSoup, title: str, description: str):
    def upsert_meta(attr_name: str, attr_value: str, content: str):
        selector = f'meta[{attr_name}="{attr_value}"]'
        tag = soup.select_one(selector)
        if not tag:
            tag = soup.new_tag("meta")
            tag[attr_name] = attr_value
            soup.head.append(tag)
        tag["content"] = content

    soup.title.string = title
    upsert_meta("name", "description", description)
    upsert_meta("property", "og:title", title)
    upsert_meta("property", "og:description", description)
    upsert_meta("name", "twitter:title", title)
    upsert_meta("name", "twitter:description", description)


def update_schema(soup: BeautifulSoup, title: str, description: str):
    script = soup.find("script", attrs={"type": "application/ld+json"})
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "name": "Indegene",
            },
            {
                "@type": "Article",
                "headline": title,
                "description": description,
                "publisher": {
                    "@type": "Organization",
                    "name": "Indegene",
                },
            },
        ],
    }
    script.string = json.dumps(data, indent=2)


def replace_main_content(template_soup: BeautifulSoup, case: dict, related_map: dict[str, str]):
    breadcrumb_span = template_soup.select_one(".oco-page-banner__breadcrumb span")
    if breadcrumb_span:
        breadcrumb_span.string = case["title"]
    banner_title = template_soup.select_one(".oco-page-banner__title")
    if banner_title:
        banner_title.string = case["title"]

    main_col = template_soup.select_one(".oco-inner-page__main")
    for child in list(main_col.children):
        if isinstance(child, Tag):
            child.decompose()

    if case["hero_img"]:
        hero_wrap = BeautifulSoup('<div class="oco-inner-img js-reveal"></div>', "html.parser").div
        hero_wrap.append(case["hero_img"])
        main_col.append(hero_wrap)

    main_col.append(build_article_block(case["main_inner"]))

    for block_type, payload in case["extra_sections"]:
        if block_type == "article":
            main_col.append(build_article_block(payload))
        elif block_type == "stats":
            title, stats = payload
            main_col.append(build_stats_block(title, stats))
        elif block_type == "images":
            main_col.append(build_image_block(payload))

    sidebar_links = template_soup.select(".oco-sidebar__widget .oco-sidebar__link")
    for link in sidebar_links:
        link.decompose()
    widget = template_soup.select_one(".oco-sidebar__widget")
    for href, text in case["related"][:4]:
        a = template_soup.new_tag("a", attrs={"class": "oco-sidebar__link", "href": related_map.get(href, "casestudy.html#caseStudyGrid")})
        icon = template_soup.new_tag("i", attrs={"class": "bi bi-arrow-up-right"})
        a.append(icon)
        a.append(NavigableString("\n              " + text + "\n            "))
        widget.append(a)


def create_filename(title: str, used: set[str]) -> str:
    base = f"case-study-{slugify(title)}"
    name = f"{base}.html"
    counter = 2
    while name in used:
        name = f"{base}-{counter}.html"
        counter += 1
    used.add(name)
    return name


def update_case_study_index(link_map: dict[str, str]):
    soup = BeautifulSoup(CASESTUDY_INDEX.read_text(), "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href in link_map:
            a["href"] = link_map[href]
    CASESTUDY_INDEX.write_text(str(soup))


def main():
    template_html = TEMPLATE_PATH.read_text()
    source_files = sorted(SOURCE_DIR.glob("*.html"))
    used_names = {TEMPLATE_PATH.name}

    cases = []
    for source in source_files:
        case = extract_case_data(source)
        case["source_file"] = source.name
        case["output_file"] = create_filename(case["title"], used_names)
        cases.append(case)

    source_url_map = json.loads((SOURCE_DIR / "manifest.json").read_text())
    link_map = {entry["url"]: next(c["output_file"] for c in cases if c["source_file"] == entry["file"]) for entry in source_url_map}

    generated = []
    for case in cases:
        soup = BeautifulSoup(template_html, "html.parser")
        update_meta(soup, case["title"], case["description"])
        update_schema(soup, case["title"], case["description"])
        replace_main_content(soup, case, link_map)
        out_path = ROOT / case["output_file"]
        out_path.write_text(str(soup))
        generated.append({"source": case["source_file"], "file": case["output_file"], "title": case["title"]})

    update_case_study_index(link_map)
    (ROOT / ".case-study-source" / "generated-manifest.json").write_text(json.dumps(generated, indent=2))
    print(json.dumps(generated, indent=2))


if __name__ == "__main__":
    main()
