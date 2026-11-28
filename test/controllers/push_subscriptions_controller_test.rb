require "test_helper"

class PushSubscriptionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @old = ENV.values_at("VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY")
    ENV["VAPID_PUBLIC_KEY"] = "pub"
    ENV["VAPID_PRIVATE_KEY"] = "priv"
  end

  teardown { ENV["VAPID_PUBLIC_KEY"], ENV["VAPID_PRIVATE_KEY"] = @old }

  def subscription(endpoint = "https://push.example.com/one")
    { subscription: { endpoint: endpoint, keys: { p256dh: "pp", auth: "aa" } } }
  end

  test "requires authentication" do
    post push_subscription_path, params: subscription
    assert_redirected_to login_path
  end

  test "saves a subscription once, and removes it by endpoint" do
    log_in_as(@user)
    assert_difference -> { @user.push_subscriptions.count }, 1 do
      post push_subscription_path, params: subscription, as: :json
      post push_subscription_path, params: subscription, as: :json
    end
    assert_response :created
    assert_difference -> { @user.push_subscriptions.count }, -1 do
      delete push_subscription_path, params: { endpoint: "https://push.example.com/one" }, as: :json
    end
  end

  test "someone else's endpoint cannot be taken over" do
    users(:two).push_subscriptions.create!(endpoint: "https://push.example.com/two", p256dh: "p", auth: "a")
    log_in_as(@user)
    post push_subscription_path, params: subscription("https://push.example.com/two"), as: :json
    assert_response :forbidden
    assert_equal users(:two), PushSubscription.find_by!(endpoint: "https://push.example.com/two").user
  end

  test "refuses when push is not configured" do
    ENV["VAPID_PUBLIC_KEY"] = nil
    log_in_as(@user)
    post push_subscription_path, params: subscription, as: :json
    assert_response :service_unavailable
  end

  test "settings tell the page whether push is available" do
    log_in_as(@user)
    get settings_path
    assert_includes response.body, "&quot;configured&quot;:true"
  end
end
