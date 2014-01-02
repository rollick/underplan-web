///////////////////////////////////////////////////////////////////////////////
// Common Stuff

// Use a reactive source to ensure the template will reactively load
// the photos once they have been fetched from the external data source
ReactiveGallerySource = {
  photos: {},
  sliders: {},
  currentSlider: null,
  _states: {},
  _stateDeps: {},
  _readyDeps: {}, // work around for issue => deps is for ready or dataReady
  _currentActivity: null,
  _currentActivityDep: null,

  setupActivity: function (activity, successCallback) {
    var group = Groups.findOne({_id: activity.group}),
        self = this;

    if (activity.picasaTags && _.isObject(group.trovebox)) {
      var params = $.extend({tags: activity.picasaTags, max: 99}, group.trovebox),
          search = new Gallery.Trovebox;

      search.albumSearch(params, function(data, params) {
        if (data.length) {
          // TODO: maybe too much in "data" for the reactive source
          self.setPhotos(activity._id, data);

          if (_.isFunction(successCallback))
            successCallback.call(activity);
        }
      });
    }
  },

  clearPhotos: function (id) {
    if(this.sliders[id] && _.isFunction(this.sliders[id].destroy)) {
      this.sliders[id].destroy();
      delete this.sliders[id];
    }
    delete this.photos[id];

    this._stateDeps[id] = null;
    this._readyDeps[id] = null;
    this.set(id, null);
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
      if (self._states[id] === "dataReady")
        self.set(id, "ready");
    });

    // Flush to ensure any code depending on dataReady will be 
    // processed immediately, eg inserting the list of images 
    // into the dom
    Deps.flush();
  },

  get: function (id) {
    this._ensureDep(id);
    this._stateDeps[id].depend();
    return this._states[id];
  },

  set: function (id, state) {
    var previousState = this._states[id];

    this._ensureDep(id);
    this._states[id] = state;

    if (previousState !== state) {
      this._stateDeps[id].changed();

      var ready = (state && !!state.match(/ready/i)) ? true : false,
          previousReady = (previousState && !!previousState.match(/ready/i)) ? true : false;

      if ((ready && !previousReady) || (!ready && previousReady)) {
        this._readyDeps[id].changed();
      }
    }
  },

  ready: function (id) {
    this._ensureDep(id);
    this._readyDeps[id].depend();
      
    var state = this._states[id];
    if (state)
      return !_.isEmpty(state.match(/ready/i));
    else
      return false;
  },

  getCurrentActivity: function () {
    this._ensureCurrentActivityDep();
    this._currentActivityDep.depend();

    return this._currentActivity;
  },

  setCurrentActivity: function (id) {
    this._ensureCurrentActivityDep();

    if (this._currentActivity !== id) {
      this._currentActivity = id;
      this._currentActivityDep.changed();
    }
  },

  _ensureCurrentActivityDep: function () {
    if (!this._currentActivityDep)
      this._currentActivityDep = new Deps.Dependency;
  },

  _ensureDep: function (id) {
    if (!this._stateDeps[id])
      this._stateDeps[id] = new Deps.Dependency;

    if (!this._readyDeps[id])
      this._readyDeps[id] = new Deps.Dependency;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Image Slider

sliderOptions = {
  nextButton: true,
  prevButton: true,
  preloader: true,
  preloadTheseFrames: [1],
  showNextButtonOnInit: false,
  showPrevButtonOnInit: false,
  swipePreventsDefault: true,
  animateStartingFrameIn: false,
  swipeEvents: {
    left: "next",
    right: "prev",
    up: false,
    down: false
}
  // autoPlay: true,
  // autoPlayDelay: 3000,
};

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
    if (ReactiveGallerySource.ready(this._id))
      return ReactiveGallerySource.photos[this._id];
    else
      return [];
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

Template.imageSlider.created = function () {
  var self = this;

  this._clearSlider = function (id, stopDeps) {
    if (!id)
      return;

    if (_.isUndefined(stopDeps))
      stopDeps = true;

    // Cleaup slider and reactive source
    if (stopDeps && !_.isUndefined(self._sourceDep)) {
      self._sourceDep.stop();
      self._sourceDep = null;
    }

    if (id)
      ReactiveGallerySource.clearPhotos(id);
  }
};

Template.imageSlider.rendered = function () {
  // FIXME: more horrible hacking to  ensure dom elements have rendered 
  //        before trying to access with jquery libs
  // TODO:  use css animations to check element is in DOM
  if (!this.data)
    return;

  var template = this;
  template._previousId = this.data._id;

  // Get photos and then setup gallery ui in callback
  ReactiveGallerySource.setupActivity(this.data, function () {
    template._sourceDep = Deps.autorun( function (computation) {
      var activityId = ReactiveGroupFilter.get("activity");
      
      if (activityId && activityId !== template._previousId) {
        template._clearSlider(template._previousId, false);

        template._previousId = activityId;
        ReactiveGallerySource.setupActivity(Activities.findOne(activityId));

        return;
      }

      var state = ReactiveGallerySource.get(template._previousId);
      if (state === "ready") {
        // FIXME: Another hack. This needs a big refactor!
        //        Check for a slider with the current activity id or the previous as the
        //        dom might not have been updated to reflect the new id 
        var slider = $("#slider-" + template._previousId);

        if (slider.length) {
          var gallery = $(slider).sequence(sliderOptions).data("sequence");
          var buttons = $(slider).find(".sequence-prev, .sequence-next");
          
          if (ReactiveGallerySource.photos[template._previousId].length > 1) {
            buttons.show();
          }

          ReactiveGallerySource.sliders[template._previousId] = gallery;
        }
      }
    });
  });
};

Template.imageSlider.destroyed = function() {
  this._clearSlider(this.data._id);
};