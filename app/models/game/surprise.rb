# frozen_string_literal: true

module Game
  # Happy surprises (see config/game/surprises.yml): a random find after a win,
  # and the daily lucky button. Pure bonus: nothing is taken away, and each
  # reference pays at most once through the ledger. The random roll happens
  # before the write and only the stored ledger row counts, so retries and
  # double-clicks cannot re-roll a better prize.
  class Surprise
    Result = Struct.new(:key, :message, :xp, :coins, :rare, :gift, :award, keyword_init: true) do
      def leveled_up? = award.to_level > award.from_level

      # "The bird found a lucky button! +8 coins."
      def summary
        parts = []
        parts << "#{coins} coins" if coins.positive?
        parts << "#{xp} XP" if xp.positive?
        parts << "#{gift} for your cottage" if gift
        "#{message} +#{parts.to_sentence(two_words_connector: ' and ', last_word_connector: ' and ')}."
      end
    end

    # Rolled after a finished quest. Returns a Result, or nil for "no find".
    def self.after_win(user:, completion:, rng: Random)
      config = Game::Catalog.surprises.fetch("win")
      return nil unless rng.rand < config.fetch("chance")

      grant(user: user, reference: "completion:#{completion.id}", prizes: config.fetch("prizes"), rng: rng)
    end

    # The once-a-day button. Always pays; nil only if already opened today.
    def self.daily(user:, rng: Random)
      prizes = Game::Catalog.surprises.fetch("daily").fetch("prizes")
      grant(user: user, reference: "daily:#{user.today.iso8601}", prizes: prizes, rng: rng)
    end

    # What was opened today, from the ledger, or nil if not yet opened.
    def self.daily_row(user)
      RewardTransaction.find_by(user: user, kind: "surprise", reference: "daily:#{user.today.iso8601}")
    end

    def self.grant(user:, reference:, prizes:, rng:)
      return nil if RewardTransaction.exists?(user: user, kind: "surprise", reference: reference)

      prize = pick(prizes, rng)
      gift = prize["gift"] ? gift_key(user, rng) : nil
      prize = pick_without_gift(prizes, rng) if prize["gift"] && gift.nil?
      xp = amount(prize["xp"], rng)
      coins = amount(prize["coins"], rng)

      award = Game::AwardOneOff.call(user: user, kind: "surprise", reference: reference, xp: xp, coins: coins)
      return nil unless award.awarded

      user.owned_decorations.find_or_create_by!(decoration_key: gift) if gift
      Result.new(key: prize["key"], message: prize["message"], xp: xp, coins: coins, rare: !!prize["rare"],
                 gift: gift && Game::Catalog.decoration(gift)["name"], award: award)
    end
    private_class_method :grant

    def self.pick(prizes, rng)
      roll = rng.rand(prizes.sum { |p| p["weight"] })
      prizes.each do |prize|
        roll -= prize["weight"]
        return prize if roll.negative?
      end
      prizes.last
    end
    private_class_method :pick

    def self.pick_without_gift(prizes, rng)
      pick(prizes.reject { |p| p["gift"] }, rng)
    end
    private_class_method :pick_without_gift

    def self.amount(range, rng)
      range ? rng.rand(range.first..range.last) : 0
    end
    private_class_method :amount

    # A cheap decoration the player does not own yet, or nil if they own them all.
    def self.gift_key(user, rng)
      max = Game::Catalog.surprises.fetch("gift_max_price")
      owned = user.owned_decorations.pluck(:decoration_key)
      options = Game::Catalog.decorations.select { |key, d| d["price"] <= max && !owned.include?(key) }.keys
      options.empty? ? nil : options[rng.rand(options.size)]
    end
    private_class_method :gift_key
  end
end
