from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Counselor, UserSubscription

class Command(BaseCommand):
    help = 'Purge counselor profiles whose subscription has been expired 90+ days'

    def handle(self, *args, **kwargs):
        cutoff = timezone.now() - timedelta(days=90)
        candidates = Counselor.objects.exclude(
            user__subscriptions__status=UserSubscription.Status.ACTIVE,
            user__subscriptions__ends_at__gt=timezone.now(),
        )
        to_purge = [c for c in candidates if not c.get_last_subscription_end_or_none() or c.get_last_subscription_end_or_none() < cutoff]
        n = len(to_purge)
        for c in to_purge:
            c.delete()
        self.stdout.write(f'Purged {n} expired counselor profiles')