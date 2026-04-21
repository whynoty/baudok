import uuid
from datetime import date
from typing import Optional

from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyReport, ReportEntry


class AnalyticsView(APIView):
    """
    GET /api/v1/analytics/

    Aggregates DailyReport and ReportEntry data for supervisors and company admins.
    Workers receive 403. All querysets are scoped to request.user.company.

    Query params (all optional):
        project   — UUID, filter by project
        worker    — UUID, filter by user (created_by)
        date_from — YYYY-MM-DD
        date_to   — YYYY-MM-DD
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Role gate — workers are not permitted
        if user.role not in ("supervisor", "company_admin"):
            return Response(
                {
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Nur Vorgesetzte oder Admins haben Zugriff auf Analytics.",
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # --- Parse optional query params ---
        project_id: Optional[uuid.UUID] = None
        worker_id: Optional[uuid.UUID] = None
        date_from: Optional[date] = None
        date_to: Optional[date] = None

        raw_project = request.GET.get("project")
        if raw_project:
            try:
                project_id = uuid.UUID(raw_project)
            except (ValueError, AttributeError):
                return Response(
                    {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "message": "Ungültige Projekt-UUID.",
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        raw_worker = request.GET.get("worker")
        if raw_worker:
            try:
                worker_id = uuid.UUID(raw_worker)
            except (ValueError, AttributeError):
                return Response(
                    {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "message": "Ungültige Worker-UUID.",
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        raw_date_from = request.GET.get("date_from")
        if raw_date_from:
            try:
                date_from = date.fromisoformat(raw_date_from)
            except (ValueError, AttributeError):
                return Response(
                    {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "message": "Ungültiges date_from Format. Erwartet: YYYY-MM-DD.",
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        raw_date_to = request.GET.get("date_to")
        if raw_date_to:
            try:
                date_to = date.fromisoformat(raw_date_to)
            except (ValueError, AttributeError):
                return Response(
                    {
                        "error": {
                            "code": "VALIDATION_ERROR",
                            "message": "Ungültiges date_to Format. Erwartet: YYYY-MM-DD.",
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # --- Base report queryset — always company-scoped ---
        base_reports = DailyReport.objects.filter(company=user.company)

        if project_id is not None:
            base_reports = base_reports.filter(project_id=project_id)
        if worker_id is not None:
            base_reports = base_reports.filter(created_by_id=worker_id)
        if date_from is not None:
            base_reports = base_reports.filter(report_date__gte=date_from)
        if date_to is not None:
            base_reports = base_reports.filter(report_date__lte=date_to)

        # --- 1. reports_by_day ---
        reports_by_day_qs = (
            base_reports.values("report_date")
            .annotate(count=Count("id"))
            .order_by("report_date")
        )
        reports_by_day = [
            {"date": str(row["report_date"]), "count": row["count"]}
            for row in reports_by_day_qs
        ]

        # --- Base entry queryset derived from the filtered reports ---
        base_entries = ReportEntry.objects.filter(report__in=base_reports)

        # --- 2. hours_by_project ---
        hours_by_project_qs = (
            base_entries.filter(category="work_performed")
            .values("report__project_id", "report__project__name")
            .annotate(total_hours=Coalesce(Sum("duration_hours"), 0))
            .order_by("-total_hours")
        )
        hours_by_project = [
            {
                "project_id": str(row["report__project_id"]) if row["report__project_id"] else None,
                "project_name": row["report__project__name"] or "",
                "total_hours": float(row["total_hours"]),
            }
            for row in hours_by_project_qs
        ]

        # --- 3. materials_by_project ---
        materials_by_project_qs = (
            base_entries.filter(category="materials_used")
            .values("report__project_id", "report__project__name")
            .annotate(entries=Count("id"))
            .order_by("-entries")
        )
        materials_by_project = [
            {
                "project_id": str(row["report__project_id"]) if row["report__project_id"] else None,
                "project_name": row["report__project__name"] or "",
                "entries": row["entries"],
            }
            for row in materials_by_project_qs
        ]

        # --- 4. top_workers (top 10 by report count) ---
        top_workers_qs = (
            base_reports.values(
                "created_by_id",
                "created_by__first_name",
                "created_by__last_name",
            )
            .annotate(report_count=Count("id"))
            .order_by("-report_count")[:10]
        )

        # Collect worker IDs for hour aggregation
        worker_ids = [row["created_by_id"] for row in top_workers_qs]

        # Sum hours per worker from work_performed entries
        hours_per_worker = {}
        if worker_ids:
            hours_qs = (
                base_entries.filter(
                    category="work_performed",
                    report__created_by_id__in=worker_ids,
                )
                .values("report__created_by_id")
                .annotate(total_hours=Coalesce(Sum("duration_hours"), 0))
            )
            hours_per_worker = {
                row["report__created_by_id"]: float(row["total_hours"])
                for row in hours_qs
            }

        top_workers = [
            {
                "worker_id": str(row["created_by_id"]),
                "worker_name": f"{row['created_by__first_name']} {row['created_by__last_name']}".strip(),
                "report_count": row["report_count"],
                "total_hours": hours_per_worker.get(row["created_by_id"], 0.0),
            }
            for row in top_workers_qs
        ]

        # --- 5. submission_rate ---
        # Always company-scoped (no additional param filters per spec)
        company_reports = DailyReport.objects.filter(company=user.company)
        total = company_reports.count()
        on_time = company_reports.exclude(status="draft").count()
        percentage = round((on_time / total * 100), 1) if total > 0 else 0.0

        submission_rate = {
            "on_time": on_time,
            "total": total,
            "percentage": percentage,
        }

        return Response(
            {
                "reports_by_day": reports_by_day,
                "hours_by_project": hours_by_project,
                "materials_by_project": materials_by_project,
                "top_workers": top_workers,
                "submission_rate": submission_rate,
            },
            status=status.HTTP_200_OK,
        )
