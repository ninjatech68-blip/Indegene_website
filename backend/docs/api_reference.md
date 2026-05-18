# API Reference

## Public Endpoints

### Navigation
- `GET /api/public/navigation/:slug`

### Pages
- `GET /api/public/pages/:slug`

### Case Studies
- `GET /api/public/case-studies?page=1&limit=12&tag=automation`
- `GET /api/public/case-studies/:slug`

### Resources
- `GET /api/public/resources?page=1&limit=12`

### Testimonials
- `GET /api/public/testimonials`

### Clients
- `GET /api/public/clients`

### Services
- `GET /api/public/services`

### Analytics Configuration
- `GET /api/public/settings/analytics`

## Form Endpoints

### Contact Form
- `POST /api/forms/contact`

Payload:
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1 555 100 1000",
  "company": "Acme Life Sciences",
  "message": "We need support with campaign operations.",
  "sourcePage": "/contactus.html"
}
```

### Newsletter
- `POST /api/forms/newsletter`

Payload:
```json
{
  "email": "jane@example.com",
  "sourcePage": "/Index.html"
}
```

## Admin API

Authenticated session required.

- `GET /api/admin-api/:collection`
- `GET /api/admin-api/:collection/:id`
- `POST /api/admin-api/:collection`
- `PUT /api/admin-api/:collection/:id`
- `DELETE /api/admin-api/:collection/:id`

Supported collections:

- `pages`
- `pageSections`
- `caseStudies`
- `resources`
- `testimonials`
- `clients`
- `services`
- `navigationMenus`
- `navigationItems`
- `settings`

## Media Upload

- `POST /api/uploads`

Multipart fields:

- `file`
- `altText`
