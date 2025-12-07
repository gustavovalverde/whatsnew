# typed: false
# frozen_string_literal: true

# Homebrew formula for whatsnew CLI
# See what changed in your dependencies
class Whatsnew < Formula
  desc "See what changed in your dependencies - changelog intelligence for developers"
  homepage "https://github.com/gustavovalverde/wnf"
  version "0.1.3"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/gustavovalverde/wnf/releases/download/%40whatsnew%2Fcli%40#{version}/whatsnew-darwin-arm64"
      sha256 "PLACEHOLDER_DARWIN_ARM64_SHA256"
    end
    on_intel do
      url "https://github.com/gustavovalverde/wnf/releases/download/%40whatsnew%2Fcli%40#{version}/whatsnew-darwin-x64"
      sha256 "PLACEHOLDER_DARWIN_X64_SHA256"
    end
  end

  on_linux do
    on_arm do
      # Only 64-bit ARM is supported (arm64), not 32-bit (armv7)
      if Hardware::CPU.is_64_bit?
        url "https://github.com/gustavovalverde/wnf/releases/download/%40whatsnew%2Fcli%40#{version}/whatsnew-linux-arm64"
        sha256 "PLACEHOLDER_LINUX_ARM64_SHA256"
      end
    end
    on_intel do
      url "https://github.com/gustavovalverde/wnf/releases/download/%40whatsnew%2Fcli%40#{version}/whatsnew-linux-x64"
      sha256 "PLACEHOLDER_LINUX_X64_SHA256"
    end
  end

  def install
    # Determine binary name based on platform and architecture
    binary_name = if OS.mac?
      Hardware::CPU.arm? ? "whatsnew-darwin-arm64" : "whatsnew-darwin-x64"
    elsif Hardware::CPU.arm?
      # Linux ARM - only 64-bit supported
      odie "32-bit ARM is not supported. Only arm64 binaries are available." unless Hardware::CPU.is_64_bit?
      "whatsnew-linux-arm64"
    else
      "whatsnew-linux-x64"
    end
    bin.install binary_name => "whatsnew"
  end

  test do
    assert_match "whatsnew v#{version}", shell_output("#{bin}/whatsnew --version")
  end
end
