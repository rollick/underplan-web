///////////////////////////////////////////////////////////////////////////////
// Common Stuff

processActivityPhotos = function (activity, successCallback) {
  var group = Groups.findOne(ReactiveGroupFilter.get("group"));

  if (activity.picasaTags && _.isObject(group.trovebox)) {
    var params = $.extend({tags: activity.picasaTags, max: 99}, group.trovebox),
        search = new Gallery.Trovebox,
        self = activity;

    search.albumSearch(params, function(data, params) {
      if (data.length) {
        // TODO: maybe too much in "data" for the reactive source
        ReactiveGallerySource.setPhotos(activity._id, data);

        if (_.isFunction(successCallback))
          successCallback.call(activity);
      }
    });
  }
};

// Use a reactive source to ensure the template will reactively load
// the photos once they have been fetched from the external data source
ReactiveGallerySource = {
  photos: {},
  states: {},
  stateDeps: {},

  clearPhotos: function (id) {
    this.photos[id] = null;
    this.stateDeps = {};
    this.set(id, '');
  },

  setPhotos: function (id, photos) {
    this.photos[id] = photos;
    this.set(id, 'dataReady');

    // We want to set the reactive key to "ready" so that the 
    // slider can be setup but we want this to happen after 
    // the dataReady deps run so that the photos list has first
    // been added to the dom.
    var self = this;
    Deps.afterFlush(function () {
      self.set(id, "ready");
    });

    // Flush to ensure any code depending on dataReady will be 
    // processed immediately, eg inserting the list of images 
    // into the dom
    Deps.flush();
  },

  get: function (id) {
    this.ensureDep(id);
    this.stateDeps[id].depend();
    return this.states[id];
  },

  set: function (id, state) {
    this.ensureDep(id);
    this.states[id] = state;
    this.stateDeps[id].changed();
  },

  ensureDep: function (id) {
    if (!this.stateDeps[id])
      this.stateDeps[id] = new Deps.Dependency;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Image Slider

sliderOptions = {
  nextButton: true,
  prevButton: true,
  preloader: false,
  showNextButtonOnInit: false,
  showPrevButtonOnInit: false,
  swipePreventsDefault: true,
  swipeEvents: {
    left: "next",
    right: "prev",
    up: false,
    down: false
}
  // autoPlay: true,
  // autoPlayDelay: 3000,
};

// Store list of sliders so they can be destroyed when the associated 
// template is destroyed
sliders = {};

Template.imageSlider.events({
  "click .sequence": function (event, template) {

    // Image clicked:
    //   Fullscreen if supported by browser otherwise expand the image slider
    var target = $(event.target),
        sequence = target.closest(".sequence");

    if (target.hasClass("main")) {
      event.stopPropagation();
      event.preventDefault();

      if (screenfull.enabled) {
        screenfull.toggle(sequence.addClass("fullscreen")[0]);
      } else {
        sequence.toggleClass("expanded", 2000).
                  find("li > div.photo").css("background-size", sequence.hasClass("expanded") ? "contain" : "cover");
      }
    }
  }
});

Template.imageSlider.helpers({
  photos: function () {
    if (ReactiveGallerySource.get(this._id)) {
      return ReactiveGallerySource.photos[this._id];
    } else {
      return false;
    }
  },
  hasPhotos: function () {
    var activity = Activities.findOne(this._id);

    if (activity) {
      return !_.isEmpty(activity.picasaTags);
    } else {
      return false;
    }
  }
});

Template.imageSlider.rendered = function () {
  // FIXME: more horrible hacking to get ensure dom elements have rendered 
  //        before trying to access with jquery libs
  // TODO:  use css animations to check element is in DOM
  if (!this.data)
    return;

  // Get photos and then setup gallery ui in callback
  processActivityPhotos(this.data, function () {
    var self = this; // an activity => scope set processActivityPhotos callback

    Deps.autorun( function (computation) {
      var id = self._id;

      if (ReactiveGallerySource.get(id) === "ready") {
        var slider = $("#slider-" + id);

        if (slider.length) {
          var gallery = $(slider).sequence(sliderOptions).data("sequence");
          var buttons = $(slider).find(".sequence-prev, .sequence-next");
          
          if (ReactiveGallerySource.photos[id].length > 1) {
            buttons.show();
          }

          sliders[id] = gallery;
        
          computation.stop();
        }
      }
    });
  });
};

Template.imageSlider.destroyed = function() {
  if (!this.data)
    return;
  
  var id = this.data._id;

  if(sliders[id] && _.isFunction(sliders[id].destroy)) {
    sliders[id].destroy();
    delete sliders[id];
  }
};