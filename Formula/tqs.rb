class Tqs < Formula
  desc "TypeScript scripts on QuickJS with built-in HTTP fetching"
  homepage "https://github.com/yowainwright/tqs"
  version "1.0.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/yowainwright/tqs/releases/download/v#{version}/tqs-darwin-arm64"
      sha256 "" # arm64
    else
      url "https://github.com/yowainwright/tqs/releases/download/v#{version}/tqs-darwin-x64"
      sha256 "" # x64
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/yowainwright/tqs/releases/download/v#{version}/tqs-linux-arm64"
      sha256 "" # linux-arm64
    else
      url "https://github.com/yowainwright/tqs/releases/download/v#{version}/tqs-linux-x64"
      sha256 "" # linux-x64
    end
  end

  depends_on "curl"

  def install
    bin.install Dir["tqs-*"].first => "tqs"
  end

  test do
    assert_match "tqs", shell_output("#{bin}/tqs 2>&1", 1)
  end
end
