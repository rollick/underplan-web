///////////////////////////////////////////////////////////////////////////////
// Common Stuff

processActivityPhotos = function (activity) {
  var group = Groups.findOne(Session.get("groupId"));

  if (activity.picasaTags && _.isObject(group.trovebox)) {
    var params = $.extend({tags: activity.picasaTags, max: 10}, group.trovebox),
        search = new Galleria.Trovebox,
        self = activity;

    search.albumSearch(params, function(data, params) {
      if (data.length) {
        ReactiveGallerySource.setPhotos(activity._id, data);
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
    this.set(id, 'ready');
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
  swipePreventsDefault: false,
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
    if (screenfull.enabled) {
      var target = $(event.target);
      if (target.hasClass("main")) {
        var sequence = target.closest(".sequence");
        screenfull.toggle(sequence.addClass("fullscreen")[0]);
        // if (screenfull.enabled) {
        //   screenfull.toggle(sequence.addClass("fullscreen")[0]);
        // } else {
        //   var match = sequence.attr("id").match(/^.*-([a-z|0-9]+)/i);
        //   if (match)
        //     Router.setActivity(match[1]);
        // }
      }
    } else {
      var target = $(event.target);
      if (target.hasClass("main")) {
        var sequence = target.closest(".sequence").toggleClass("expanded", 2000);
        sequence.find("li > div.photo").css("background-size", sequence.hasClass("expanded") ? "contain" : "cover");
      }      
    }
  }
});

Template.imageSlider.photos = function () {
  if (ReactiveGallerySource.get(this._id) === "ready") {
    return ReactiveGallerySource.photos[this._id];
  }
  else
    return [];
};

Template.imageSlider.created = function () {
  processActivityPhotos(this.data);
};

Template.imageSlider.rendered = function () {
  var id = this.data._id;
  var slider = this.find("#slider-" + id);

  if (slider) {
    var gallery = $(slider).sequence(sliderOptions).data("sequence");
    var buttons = $(slider).find(".sequence-prev, .sequence-next");
    
    // Only show next / prev buttons if > 1 photos and no swipe support
    if (!("ontouchstart" in window) && ReactiveGallerySource.photos[id].length > 1)
      buttons.fadeIn(500);
    else
      buttons.hide();

    sliders[this.data._id] = gallery;
  }
};

Template.imageSlider.destroyed = function() {
  var id = this.data._id;

  if(sliders[id] && _.isFunction(sliders[id].destroy)) {
    sliders[id].destroy();
    delete sliders[id];
  }
};