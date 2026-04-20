import pytest
from apps.reports.export import generate_csv, generate_excel


@pytest.mark.django_db
class TestCSVExport:
    def test_generates_bytes(self, sample_report):
        result = generate_csv([sample_report])
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_contains_report_date(self, sample_report):
        result = generate_csv([sample_report]).decode('utf-8-sig')
        assert str(sample_report.report_date) in result

    def test_empty_list(self):
        result = generate_csv([])
        assert isinstance(result, bytes)


@pytest.mark.django_db
class TestExcelExport:
    def test_generates_bytes(self, sample_report):
        result = generate_excel([sample_report])
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_valid_xlsx_magic_bytes(self, sample_report):
        result = generate_excel([sample_report])
        # XLSX files start with PK (ZIP magic bytes)
        assert result[:2] == b'PK'
