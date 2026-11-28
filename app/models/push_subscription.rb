# frozen_string_literal: true

# One browser/device that agreed to get Nest Quest notifications.
class PushSubscription < ApplicationRecord
  belongs_to :user

  validates :endpoint, presence: true, uniqueness: true, length: { maximum: 2000 },
                       format: { with: %r{\Ahttps://\S+\z}, message: "must be an https URL" }
  validates :p256dh, :auth, presence: true
end
