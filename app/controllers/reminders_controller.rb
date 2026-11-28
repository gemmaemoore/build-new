# frozen_string_literal: true

# One-tap unsubscribe from reminder emails, via a signed link (no login needed).
class RemindersController < ApplicationController
  allow_unauthenticated_access

  def unsubscribe
    user = User.find_by_token_for(:reminder_unsubscribe, params[:token])
    user&.update!(reminder_enabled: false)
    render inertia: "reminders/Unsubscribed", props: { done: user.present? }
  end
end
