class AllowSurpriseAndBlitzRewards < ActiveRecord::Migration[8.0]
  NAME = "index_reward_transactions_once_per_engagement_reward"

  def change
    remove_index :reward_transactions, name: NAME,
                 column: [ :user_id, :reference ], unique: true,
                 where: "kind IN ('todo', 'boss_stage', 'boss_defeat', 'challenge')"
    add_index :reward_transactions, [ :user_id, :reference ], unique: true, name: NAME,
              where: "kind IN ('todo', 'boss_stage', 'boss_defeat', 'challenge', 'surprise', 'blitz')"
  end
end
