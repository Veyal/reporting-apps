curl -X POST "https://api-open.olsera.co.id/api/open-api/v1/id/token" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "gP3lntQHc8EiFML3TgJL",
    "secret_key": "cH7hjmkWQP0LlzIhLgkyaAhEKckRY57k",
    "grant_type": "secret_key"
  }'

  response

  {
  "token_type": "Bearer",
  "expires_in": 86400,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOi...",
  "refresh_token": "60842597d11b1966b0f630c8060710616b986219c1caec12c...",
  "expires_refresh_token": 2592000
}

---

curl -X GET "https://api-open.olsera.co.id/api/open-api/v1/en/inventory/stockmovement?start_date=2025-08-21&end_date=2025-09-21" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9hcGktb3Blbi5vbHNlcmEuY28uaWRcL2FwaVwvb3Blbi1hcGlcL3YxXC9pZFwvdG9rZW4iLCJpYXQiOjE3NTg0NTg5NDIsImV4cCI6MTc1ODU0NTM0MiwibmJmIjoxNzU4NDU4OTQyLCJqdGkiOiJkN2I1NjM5OTJmOGNiM2JlZTQ0OTY4ZDZlMzIwYzgxNTRmM2JlNTY3YmQ5ZGExZjg1NmVmZTQyMmNlZDc4YmZlYTY2YzdhNTZjOTUzYTg4YTE3NTg0NTg5NDIiLCJzdWIiOjMyOSwicHJ2IjoiNDI1YzY2MmRjMWU4MDlkM2UxOGNhNDU3NjFkMGY2MWQ4MGJmNmNlMyIsImd1YXJkIjoib3BlbmFwaSIsImFwcF9pZCI6ImdQM2xudFFIYzhFaUZNTDNUZ0pMIiwic3RvcmVfdXJsX2lkIjoic2VwaW8ifQ.YOl6KweCNM0IJR0SxfcZ6znWGZ3E8FjEnlTFHzV82Po" \
  -H "Accept: application/json"

---

response on sample_response.json