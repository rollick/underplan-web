(function($) {
  $.picasa = {
    albums: function(user, callback) {
      var url = "http://picasaweb.google.com/data/feed/base/user/:user_id?alt=json&kind=album&hl=en_US&access=visible&fields=entry(id,media:group(media:content,media:description,media:keywords,media:title))&callback=?";
      url = url.replace(/:user_id/, user);
      $.getJSON(url, function(data) {
        var album = null;
        var albums = [];
        $.each(data.feed.entry, function(i, element) {
          album = {
            id: element.id["$t"].split("?")[0].split("albumid/")[1],
            title: element["media$group"]["media$title"]["$t"],
            description: element["media$group"]["media$description"]["$t"],
            thumb: element["media$group"]["media$content"][0]["url"],
          }
          album.images = function(callback) {
            $.picasa.images(user, album.id, callback);
          }
          albums.push(album);
        });
        callback(albums);
      });
    },
    
    images: function(user, album, tags, callback) {
      var url = "http://picasaweb.google.com/data/feed/base/user/:user_id/album/:album_id?alt=json&fields=entry(title,gphoto:numphotos,media:group(media:content,media:thumbnail))&kind=photo&imgmax=912&thumbsize=85c&callback=?";
      url = url.replace(/:user_id/, user).replace(/:album_id/, album);
      if(typeof tags == "string" && tags.length)
        url = url + "&tag=" + tags;

      var image = null;
      var images = [];
      $.getJSON(url, function(data) {
        if(data.feed.entry) {
          $.each(data.feed.entry, function(i, element) {
            image = element["media$group"]["media$content"][0];
            image.title = element.title["$t"];
            image.thumbs = [];
            $.each(element["media$group"]["media$thumbnail"], function(j, j_element) {
              image.thumbs.push(j_element);
            });
            images.push(image);
          });
          callback(images);
        }
      });
    }
  };
  
  $.fn.picasaAlbums = function(user, callback) {
    $.picasa.albums(user, function(images) {
      if (callback) {
        callback(images);
      }
    });
  };
  
  $.fn.picasaGallery = function(user, album, callback) {
    var scope = $(this);
    $.picasa.images(user, album, function(images) {
      if (callback) {
        callback(images);
      } else {
        var picasaAlbum = "<ul class='picasa-album'>\n";
        $.each(images, function(i, element) {
          picasaAlbum += "  <li class='picasa-image'>\n";
          picasaAlbum += "    <a class='picasa-image-large' href='" + element.url + "'>\n";
          picasaAlbum += "      <img class='picasa-image-thumb' src='" + element.thumbs[1].url + "'/>\n";
          picasaAlbum += "    </a>\n";
          picasaAlbum += "  </li>\n";
        });
        picasaAlbum += "</ul>";
        scope.append(picasaAlbum);
      }
    });
  }
})(jQuery);