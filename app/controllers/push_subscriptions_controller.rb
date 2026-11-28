# frozen_string_literal: true

# Saves or removes this browser's push subscription. Called with a raw fetch()
# from the Settings page (not Inertia's router), so JSON responses are right.
class PushSubscriptionsController < ApplicationController
  def create
    return head(:service_unavailable) unless Push.configured?

    keys = params.dig(:subscription, :keys) || {}
    sub = PushSubscription.find_or_initialize_by(endpoint: params.dig(:subscription, :endpoint).to_s)
    return head(:forbidden) if sub.persisted? && sub.user_id != Current.user.id

    sub.assign_attributes(user: Current.user, p256dh: keys[:p256dh].to_s, auth: keys[:auth].to_s)
    sub.save ? head(:created) : render(json: { errors: sub.errors.full_messages }, status: :unprocessable_entity)
  end

  def destroy
    Current.user.push_subscriptions.where(endpoint: params[:endpoint].to_s).destroy_all
    head :no_content
  end
end
