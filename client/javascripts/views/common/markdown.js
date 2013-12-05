Template._markdown.htmlContent = function() {
  var html = "";
  if(this.text) {
    var converter = new Showdown.converter();
    html = converter.makeHtml(this.text);
  }

  return html
};