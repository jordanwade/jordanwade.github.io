# ====================================
#   Activate Plugins
# ====================================

activate :automatic_image_sizes
activate :directory_indexes
activate :livereload
activate :automatic_image_sizes

# ====================================
#   Global Variables
# ====================================

set :css_dir,     'assets/stylesheets'
set :js_dir,      'assets/javascripts'
set :images_dir,  'assets/images'
set :fonts_dir,   'assets/fonts'

# ====================================
#   Build Configuration
# ====================================

configure :build do
  activate :minify_css
  activate :minify_javascript
  activate :relative_assets
end
