var dashboardMap = null;
var dashboardMapBounds = null;

///////////////////////////////////////////////////////////////////////////////
// Feed Gallery

var setupGallery = function () {

  Deps.autorun(function(computation) {
    if (isDev()) {
      computation.onInvalidate(function() {
        console.trace();
      });
    }

    if (ReactiveGroupFilter.get("group")) {
      logIfDev("Loading Feed Gallery");

      var group = Groups.findOne(ReactiveGroupFilter.get("group"));

      // NOTE: this needs work. shouldn't always assume skip limit is max loaded
      var limit = App.Defaults.galleryLimitSkip;
      var offset = Session.get("galleryLimit") - limit;

      var self = this;
      $(".gallery-more a").addClass("disabled");

      if (_.isObject(group.trovebox)) {
        var params = $.extend({tags: null}, group.trovebox);

        if (ReactiveGroupFilter.get("country"))
          params.tags = ReactiveGroupFilter.get("country");

        Gallery.Trovebox.albumSearch(params, function(data) {
          if (_.isEmpty(data)) {
            $(".top-extra").addClass("no-photos");
          } else {
            $(".top-extra").removeClass("no-photos");
            // reverse the order to get newest to oldest and then process gallery
            processFeedPhotos(data.reverse(), offset, ".recent-photos");
          }
        });
      }
    }
  });
};

var processFeedPhotos = function (data, offset, galleryContainer) {
  if (offset > 0 && Galleria.length) { // Append data to existing gallery
    var gallery = Galleria.get(0);
    var currentLength = gallery.getDataLength();

    var t = gallery.push(data, function () {
      // Skip to the first of the images just fetched
      this.show(this.getDataLength() - data.length);
    });

  } else { // Create initial gallery
    feedGallery = Galleria.run(galleryContainer, {
      dataSource: data,
      _toggleInfo: false,
      debug: isDev(),
      extend: function(s) {
        // create an element 'galleria-map'
        this.addElement('map');
        // add to default 'galleria-container'
        this.appendChild('container', 'map');

        if (! Galleria.TOUCH ) {
          this.addIdleState( this.get('map'), { opacity: 0 });
          this.addIdleState( this.get('info'), { opacity: 0 });
        }

        var gallery = this;
        gallery.attachKeyboard({
          left: gallery.prev,
          right: gallery.next,
        });

        $('.galleria-image').click(function(event) {
          var galleria = $(event.target).closest(".galleria-container");
          var container = $(event.target).closest(".gallery");

          if (galleria.hasClass("fullscreen")) {
            event.preventDefault();

            // gallery.defineTooltip("fullscreen", s._locale.exit_fullscreen);
            gallery.addIdleState(gallery.$("bar"), {
              bottom: -31
            });
          } else if (! container.hasClass("visible")) {
            container.addClass("visible");
          }
        });

        $("#fullscreen").click(function() {
          event.preventDefault();
          gallery.enterFullscreen();
        });
      }
    });
  }
};

Template.feedGallery.rendered = function() {
  setupGallery();
};

Template.feedGallery.events({
  "click .gallery-more a": function () {
    if ($(".gallery-more a").hasClass("disabled"))
      return false;

    Session.set("galleryLimit", Session.get("galleryLimit") + App.Defaults.galleryLimitSkip);
    return false;
  },
  "click .galleria-map": function () {
    $(".gallery").removeClass("visible");
  }
})

Template.feedGallery.helpers({
  gallery: function () {
    return new Handlebars.SafeString("<p class=\"alert-box\"></p>");
  }
});

Template.feedGallery.group = function () {
  return Groups.findOne({_id: ReactiveGroupFilter.get("group")});
};

Template.feedGallery.picasaGalleryUrl = function () {
  var group = Groups.findOne({_id: ReactiveGroupFilter.get("group")});
  var picasaPath = [group.picasaUsername, group.picasaAlbum].join("/");

  if(group.picasaKey)
    picasaPath += "?authkey=" + group.picasaKey;

  return "https://picasaweb.google.com/" + picasaPath;
};

Template.feedGallery.hasGallery = function () {
  var group = Groups.findOne(ReactiveGroupFilter.get("group"));

  if (!group) {
    return false
  } else {
    return _.isObject(group.trovebox) || !!group.picasaUsername
  }
};