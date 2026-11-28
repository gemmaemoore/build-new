require "test_helper"
require "minitest/mock"

class PushTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
    @user.push_subscriptions.destroy_all
    @sub = @user.push_subscriptions.create!(endpoint: "https://push.example.com/abc", p256dh: "p", auth: "a")
    @old = ENV.values_at("VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY")
    ENV["VAPID_PUBLIC_KEY"] = "pub"
    ENV["VAPID_PRIVATE_KEY"] = "priv"
  end

  teardown do
    ENV["VAPID_PUBLIC_KEY"], ENV["VAPID_PRIVATE_KEY"] = @old
  end

  test "is off without keys and sends nothing" do
    ENV["VAPID_PUBLIC_KEY"] = nil
    assert_not Push.configured?
    assert_equal 0, Push.notify(@user, title: "t", body: "b")
  end

  test "sends a payload to each subscription with the VAPID details" do
    seen = []
    WebPush.stub(:payload_send, ->(**args) { seen << args }) do
      assert_equal 1, Push.notify(@user, title: "One tiny thing today", body: "Wipe the sides", path: "/quests")
    end
    assert_equal "https://push.example.com/abc", seen.first[:endpoint]
    payload = JSON.parse(seen.first[:message])
    assert_equal "One tiny thing today", payload["title"]
    assert_equal "/quests", payload.dig("options", "data", "path")
    assert_equal "pub", seen.first[:vapid][:public_key]
  end

  test "an expired subscription is removed" do
    WebPush.stub(:payload_send, ->(**) { raise WebPush::ExpiredSubscription.new(Struct.new(:body, :message).new("", ""), "host") }) do
      assert_equal 0, Push.notify(@user, title: "t", body: "b")
    end
    assert_not PushSubscription.exists?(@sub.id)
  end

  test "other failures are skipped and the subscription kept" do
    WebPush.stub(:payload_send, ->(**) { raise "boom" }) do
      assert_equal 0, Push.notify(@user, title: "t", body: "b")
    end
    assert PushSubscription.exists?(@sub.id)
  end

  test "only https endpoints are accepted" do
    assert_not @user.push_subscriptions.build(endpoint: "http://insecure", p256dh: "p", auth: "a").valid?
    assert_not @user.push_subscriptions.build(endpoint: "https://ok.example.com/x\nhttp://evil", p256dh: "p", auth: "a").valid?
  end
end
