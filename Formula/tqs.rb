class Tqs < Formula
  desc "Quick TypeScript scripts with QuickJS and maybefetch"
  homepage "https://github.com/jeffrywainwright/tqs"
  url "https://github.com/jeffrywainwright/tqs/archive/v1.0.0.tar.gz"
  sha256 ""
  license "MIT"

  depends_on "node" => :build
  depends_on "curl"
  depends_on "quickjs"

  def install
    system "npm", "install", *std_npm_args(prefix: false)
    system "npm", "run", "build"

    bin.install "dist/cli.js" => "tqs"
    lib.install Dir["dist/*"]
    lib.install Dir["build/Release/*"]
  end

  test do
    output = shell_output("#{bin}/tqs --version")
    assert_match "1.0.0", output
  end
end