"""
support_views.py — lives in your api app.
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SupportTicket, TicketReply
from .support_serializers import SupportTicketSerializer, TicketReplySerializer


class MyTicketListCreateView(generics.ListCreateAPIView):
    """GET: the logged-in user's own tickets, any role. POST: create
    a new one. No staff/role distinction here — everyone uses the
    same endpoint for their own tickets."""

    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SupportTicket.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TicketDetailView(generics.RetrieveAPIView):
    """A single ticket with its full reply thread. Staff can view any
    ticket; a regular user can only view their own."""

    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return SupportTicket.objects.all()
        return SupportTicket.objects.filter(user=self.request.user)


class TicketReplyCreateView(APIView):
    """Post a reply on a ticket — the owner replying to their own
    ticket, or staff responding to it. Anyone else gets a 404 rather
    than a 403, so a non-owner can't even confirm the ticket exists."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            if request.user.is_staff:
                ticket = SupportTicket.objects.get(pk=pk)
            else:
                ticket = SupportTicket.objects.get(pk=pk, user=request.user)
        except SupportTicket.DoesNotExist:
            return Response({"detail": "تیکت یافت نشد"}, status=status.HTTP_404_NOT_FOUND)

        message = request.data.get("message", "").strip()
        if not message:
            return Response(
                {"message": ["این فیلد الزامی است"]}, status=status.HTTP_400_BAD_REQUEST
            )

        reply = TicketReply.objects.create(ticket=ticket, sender=request.user, message=message)

        # Staff replying moves the ticket into "in progress" if it was
        # still pending — a reasonable default, not a hard rule.
        if request.user.is_staff and ticket.status == SupportTicket.Status.PENDING:
            ticket.status = SupportTicket.Status.IN_PROGRESS
            ticket.save(update_fields=["status"])

        return Response(
            TicketReplySerializer(reply).data, status=status.HTTP_201_CREATED
        )
