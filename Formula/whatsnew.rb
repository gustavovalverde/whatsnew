# typed: false
# frozen_string_literal: true

# Homebrew formula for whatsnew CLI
#
# Installation:
#   brew tap gustavovalverde/wnf https://github.com/gustavovalverde/wnf
#   brew install whatsnew
#
# After each release, the update-formula workflow automatically updates
# the version and SHA256 values. Manual update if needed:
#   1. Update version "X.Y.Z"
#   2. Update all sha256 values from the release .sha256 files
#
# Note: Release tag format is @whatsnew/cli@X.Y.Z (URL-encoded in download URLs)
#
class Whatsnew < Formula
  desc "See what changed in your dependencies"
  homepage "https://github.com/gustavovalverde/wnf"
  version "0.1.0"
  license "MIT"

  # URL-encoded tag: @whatsnew/cli@version -> %40whatsnew%2Fcli%40version
  def self.release_url(binary)
    tag = "%40whatsnew%2Fcli%40#{version}"
    "https://github.com/gustavovalverde/wnf/releases/download/#{tag}/#{binary}"
  end

  on_macos do
    if Hardware::CPU.arm?
      url Whatsnew.release_url("whatsnew-darwin-arm64")
      sha256 "SHA256_DARWIN_ARM64"

      def install
        bin.install "whatsnew-darwin-arm64" => "whatsnew"
      end
    end

    if Hardware::CPU.intel?
      url Whatsnew.release_url("whatsnew-darwin-x64")
      sha256 "SHA256_DARWIN_X64"

      def install
        bin.install "whatsnew-darwin-x64" => "whatsnew"
      end
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url Whatsnew.release_url("whatsnew-linux-x64")
      sha256 "SHA256_LINUX_X64"

      def install
        bin.install "whatsnew-linux-x64" => "whatsnew"
      end
    end

    if Hardware::CPU.arm? && Hardware::CPU.is_64_bit?
      url Whatsnew.release_url("whatsnew-linux-arm64")
      sha256 "SHA256_LINUX_ARM64"

      def install
        bin.install "whatsnew-linux-arm64" => "whatsnew"
      end
    end
  end

  livecheck do
    url "https://github.com/gustavovalverde/wnf/releases?q=whatsnew"
    regex(/@whatsnew\/cli@(\d+(?:\.\d+)+)/i)
  end

  test do
    assert_match "whatsnew", shell_output("#{bin}/whatsnew --help")
    assert_match version.to_s, shell_output("#{bin}/whatsnew --version")
  end
end
