"""Pure slot-generation logic — no DB writes. Used by both the
preview endpoint (dry-run) and the generate endpoint (which diffs
this output against existing slots before persisting)."""

from datetime import datetime, timedelta
from .models import Holiday


def get_holidays_in_range(start_date, end_date):
    """Returns a list of {date, name} dicts for every official holiday
    inside the range — used by the preview endpoint to tell the
    counselor which days are holidays before they commit to
    generating, so they can decide whether to include them."""
    return list(
        Holiday.objects.filter(date__gte=start_date, date__lte=end_date)
        .order_by("date")
        .values("date", "name")
    )


def generate_slots(schedule, start_date, end_date, work_on_holidays=False):
    """Returns a list of dicts: {date, start_time, end_time}.
    Never touches the DB — caller decides what to do with the output.

    work_on_holidays=False (default): holidays are skipped, same as
    any other non-working day. True: holidays are treated as normal
    working days if the weekday itself is enabled — this is an
    explicit opt-in the counselor makes after seeing which dates are
    holidays (see get_holidays_in_range), not a silent default."""
    duration = timedelta(minutes=schedule.session_duration_minutes)
    gap = timedelta(minutes=schedule.gap_minutes)

    working_days = {wd.weekday: wd for wd in schedule.working_days.filter(is_enabled=True)}

    holiday_dates = set()
    if not work_on_holidays:
        holiday_dates = set(
            Holiday.objects.filter(date__gte=start_date, date__lte=end_date).values_list(
                "date", flat=True
            )
        )

    results = []
    current_date = start_date
    while current_date <= end_date:
        if current_date in holiday_dates:
            current_date += timedelta(days=1)
            continue

        # Python's Monday=0 vs project's Saturday=0 — convert.
        py_weekday = current_date.weekday()  # Mon=0..Sun=6
        project_weekday = (py_weekday + 2) % 7  # Sat=0..Fri=6

        wd = working_days.get(project_weekday)
        if wd:
            breaks = list(wd.breaks.all())
            cursor = datetime.combine(current_date, wd.start_time)
            day_end = datetime.combine(current_date, wd.end_time)

            while cursor + duration <= day_end:
                slot_start = cursor
                slot_end = cursor + duration

                overlaps_break = any(
                    slot_start.time() < b.end_time and slot_end.time() > b.start_time
                    for b in breaks
                )
                if not overlaps_break:
                    results.append({
                        "date": current_date,
                        "start_time": slot_start.time(),
                        "end_time": slot_end.time(),
                    })
                cursor = slot_end + gap

        current_date += timedelta(days=1)

    return results