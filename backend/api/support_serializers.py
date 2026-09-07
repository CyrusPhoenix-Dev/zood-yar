"""
support_serializers.py — lives in your api app.
"""
from rest_framework import serializers

from .models import SupportTicket, TicketReply


class TicketReplySerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    is_staff_reply = serializers.BooleanField(source="sender.is_staff", read_only=True)

    class Meta:
        model = TicketReply
        fields = ["id", "message", "sender_name", "is_staff_reply", "created_at"]
        read_only_fields = ["id", "sender_name", "is_staff_reply", "created_at"]

    def get_sender_name(self, obj):
        return obj.sender.get_full_name() or obj.sender.username


class SupportTicketSerializer(serializers.ModelSerializer):
    replies = TicketReplySerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = ["id", "subject", "message", "status", "created_at", "updated_at", "replies"]
        read_only_fields = ["id", "status", "created_at", "updated_at", "replies"]
