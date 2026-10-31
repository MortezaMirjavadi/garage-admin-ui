"""Thin client for Garage's admin API (v2)."""

from __future__ import annotations

import requests
from flask import current_app

from ..errors import ApiError


class GarageAdminClient:
    def __init__(self, base_url: str, token: str, timeout: int = 20):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            }
        )
        self.timeout = timeout

    def _request(self, method: str, path: str, params=None, json=None):
        url = f"{self.base_url}/v2/{path.lstrip('/')}"
        try:
            response = self.session.request(
                method, url, params=params, json=json, timeout=self.timeout
            )
        except requests.RequestException as exc:
            raise ApiError(
                502,
                "GarageUnreachable",
                f"Cannot reach the Garage admin API at {self.base_url}: {exc}",
            )

        if not response.ok:
            try:
                body = response.json()
            except ValueError:
                body = {}
            raise ApiError(
                response.status_code,
                body.get("code") or "GarageError",
                body.get("message") or response.text or response.reason or "Garage request failed",
            )

        if response.status_code == 204 or not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            return None

    def get(self, path: str, params=None):
        return self._request("GET", path, params=params)

    def post(self, path: str, params=None, json=None):
        return self._request("POST", path, params=params, json=json)


def admin_client() -> GarageAdminClient:
    return current_app.extensions["admin_client"]