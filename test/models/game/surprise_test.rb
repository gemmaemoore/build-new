require "test_helper"

class Game::SurpriseTest < ActiveSupport::TestCase
  # A scripted random source: returns the queued values in order.
  class Rng
    def initialize(*values) = @values = values
    def rand(arg = nil)
      value = @values.shift
      return value unless arg.is_a?(Range) || arg.is_a?(Integer)
      return arg.first if arg.is_a?(Range) && value.nil?
      value.nil? ? 0 : value
    end
  end

  setup do
    Game::Catalog.surprises["win"]["chance"] = 0.3
    @user = users(:one)
    @user.tasks.destroy_all
    task = @user.tasks.create!(title: "Wipe")
    @completion = task.complete!(today: @user.today)
  end

  def coins = @user.progress.reload.coins

  test "no find when the chance roll misses" do
    assert_nil Game::Surprise.after_win(user: @user, completion: @completion, rng: Rng.new(0.99))
  end

  test "a find pays coins once, keyed by the completion" do
    before = coins
    result = Game::Surprise.after_win(user: @user, completion: @completion, rng: Rng.new(0.0, 0, 7))
    assert_equal "lucky_button", result.key
    assert_equal 7, result.coins
    assert_equal before + 7, coins
    assert_match "lucky button", result.summary

    again = Game::Surprise.after_win(user: @user, completion: @completion, rng: Rng.new(0.0, 0, 11))
    assert_nil again
    assert_equal before + 7, coins
    assert_equal 1, RewardTransaction.where(kind: "surprise", reference: "completion:#{@completion.id}").count
  end

  test "an XP sparkle pays xp" do
    before = @user.progress.reload.xp
    result = Game::Surprise.after_win(user: @user, completion: @completion, rng: Rng.new(0.0, 75, 9))
    assert_equal "sparkle", result.key
    assert_equal before + 9, @user.progress.reload.xp
  end

  test "the rare cottage gift grants an unowned decoration for free" do
    result = Game::Surprise.after_win(user: @user, completion: @completion, rng: Rng.new(0.0, 97, 0))
    assert_equal "cottage_gift", result.key
    assert result.gift
    key = Game::Catalog.decorations.find { |_, d| d["name"] == result.gift }.first
    assert @user.owned_decorations.exists?(decoration_key: key)
    assert_equal 0, result.coins
  end

  test "when every cheap decoration is owned the gift falls back to a normal prize" do
    max = Game::Catalog.surprises["gift_max_price"]
    Game::Catalog.decorations.each { |key, d| @user.owned_decorations.find_or_create_by!(decoration_key: key) if d["price"] <= max }
    result = Game::Surprise.after_win(user: @user, completion: @completion, rng: Rng.new(0.0, 97, 0, 3))
    assert_not_equal "cottage_gift", result.key
    assert_nil result.gift
  end

  test "the daily button always pays and only once a day" do
    before = [ coins, @user.progress.xp ]
    first = Game::Surprise.daily(user: @user, rng: Rng.new(0, 5))
    assert first
    assert_operator coins + @user.progress.xp, :>, before.sum
    assert_nil Game::Surprise.daily(user: @user, rng: Rng.new(0, 5))
    assert Game::Surprise.daily_row(@user)
  end

  test "each win prize table has weights and a message" do
    %w[win daily].each do |pool|
      prizes = pool == "win" ? Game::Catalog.surprises["win"]["prizes"] : Game::Catalog.surprises["daily"]["prizes"]
      assert prizes.all? { |p| p["weight"].positive? && p["message"].present? }, pool
    end
  end
end
