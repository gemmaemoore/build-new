require "test_helper"

class PwaTest < ActionDispatch::IntegrationTest
  test "the manifest is public and offers home-screen shortcuts" do
    get pwa_manifest_path(format: :json)
    assert_response :success
    manifest = JSON.parse(response.body)
    assert_equal "Nest Quest", manifest["name"]
    assert_equal "standalone", manifest["display"]
    urls = manifest["shortcuts"].map { |s| s["url"] }
    assert_includes urls, "/todos?add=1"
    assert_includes urls, "/blitz"
  end

  test "pages link the manifest" do
    get root_path
    assert_includes response.body, 'rel="manifest"'
  end
end
