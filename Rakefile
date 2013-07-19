namespace :deploy do
  puts "## Generating site with Middleman"
  system "./bin/middleman build --clean"
  system "rsync -avz --delete -e ssh ./build/ jamesjordanwade.com@jamesjordanwade.com:/home/162712/users/.home/domains/jamesjordanwade.com"
end
