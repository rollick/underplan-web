this.renderPicasaPhotos = function (photos, options) {
  var element = options.element;

  if (!element || !photos) {
    return false;
  }

  var style = options.style || "clearing";
  var styleTemplate;

  if (style === "orbit") {
    styleTemplate = "picasaSlideshow";
  } else {
    styleTemplate = "picasaGallery";
  }

  $(element).html(Template[styleTemplate]($.extend({photos: photos}, options)));
  // FIXME: implement new clearing code
  $(element).foundation(style);

  console.log("Rendering picasa photos");

  return true;
};