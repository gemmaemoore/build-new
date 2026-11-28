# frozen_string_literal: true

# Browser push (Web Push). Off until VAPID keys are set:
#   bin/rails nest_quest:vapid_keys   (prints the two values to put in the environment)
# VAPID_SUBJECT is a mailto: or https: contact for push services (optional).
module Push
  module_function

  def public_key = ENV["VAPID_PUBLIC_KEY"].presence
  def private_key = ENV["VAPID_PRIVATE_KEY"].presence
  def configured? = public_key.present? && private_key.present?

  def subject
    ENV["VAPID_SUBJECT"].presence || "mailto:#{ActionMailer::Base.default[:from] || 'hello@example.com'}"
  end

  # Sends a notification to every device the user enabled. Dead subscriptions
  # are removed; any other failure is logged and skipped. Returns how many sent.
  def notify(user, title:, body:, path: "/")
    return 0 unless configured?

    message = { title: title, options: { body: body, icon: "/icon-192.png", badge: "/icon-192.png", data: { path: path } } }.to_json
    user.push_subscriptions.to_a.count do |sub|
      WebPush.payload_send(message: message, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth,
                           vapid: { subject: subject, public_key: public_key, private_key: private_key })
      true
    rescue WebPush::ExpiredSubscription, WebPush::InvalidSubscription, WebPush::Unauthorized
      sub.destroy
      false
    rescue StandardError => e
      Rails.logger.warn("Push to subscription #{sub.id} failed: #{e.class}")
      false
    end
  end
end
