//  /* vim:et: set ts=2 sw=4 sts=4 tw=79: */
//
//=============================================================================
//  MuseScore - Open Source Music Score Editor
//  Plugin: iRealb
//  Author: David Wright <david_v_wright@yahoo.com>
//
//  NOTE: Tested against MuseScore 1.1 only!
//
//  What:
//        This plugin attempts to convert a MuseScore XML file
//        into a iRealb chart.
//  How:
//        1.  Open MuseScore
//        2.  Create a regular MuseScore chart
//        3.  Save your MuseScore chart as a MusicXML file.
//        4.  Go to Plugins -> iRealb
//        5.  Select the XML file of you chart.
//        6.  'Select All' -> Copy the URI from the Text Dialog window. 
//            (NOTE: the text dialog window is editable, which is handy for
//                   quick edits/changes once you get familiar with the 
//                   iRealb syntax.)
//        7.  Open a Web Browser and navigate to http://www.irealb.com/editor/
//        8.  Paste the URI from above in the textarea titled:
//            'IMPORT - Paste a song/playlist code here:'
//        9.  Click 'Import'
//        10. Compare the Web Editor results with your MuseScore Chart
//        11. Make the corrections needed via the iRealb Web Editor
//            (there will probably be many ;) 
//        12. Export your song (Email, etc) from the iRealb Web Editor
//            to get it on your iRealb app.
//       
//
//        NOTE: It does not convert every (any ;) chart accurately.
//              It does often get many of the chords and form correct.
//              usually, at the worst, it can save you time creating
//              your chart via the Web Editor.
//
//  Install:
//        1. Download the plugin by right clicking the link and save target as.
//        2. Uncompress the file (Unzip)
//        3. Place the unzipped dir, 'irealb' into the plugins directory of 
//           MuseScore.
//
//            Windows: 
//                     C:\Program Files\MuseScore\plugins
//
//            Linux (Ubuntu): 
//                     /usr/share/mscore-{VERSION}/plugins
//                     i.e. /usr/share/mscore-1.1/plugins
//
//            MacOSX: not sure
//
//        4. Restart or start MuseScore
//
//  General: 
//        I would prefer to use the Plugin API but currently getting chords
//        from a Harmony object is not possible. The approach this plugin uses
//        just parses XML for node elements. 
//        ref see: http://musescore.org/en/node/12727
//
//  Sat Nov 19 01:12:57 PST 2011
//  
//  Thanks to 'JazzClub' for the XML2Impro-Visor.js plugin
//
//  This code contains ideas and code from XML2Impro-Visor.js
//
//  Also Thanks to Marc Sabatella, who's articles on
//  'New Jazz / Lead Sheet Features in MuseScore 1.1' got me interested
//  in MuseScore to begin with.
//
//  This is ECMAScript code (ECMA-262 aka "Java Script")
//
//  Copyright (C) 2008-2011 Werner Schweer and others
//
//  This program is free software; you can redistribute it and/or modify
//  it under the terms of the GNU General Public License version 2.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program; if not, write to the Free Software
//  Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
//=============================================================================

//TODO:
// check start of every measure for a tempo change (Try Again)
// 'repeat signs'? (i.e. replace regular barlines with repeat signs if exist)
//
// Maybe:
// encode URI have 'send to iPhone' feature (Email even?)
// encode URI link to open web editor 'pre loaded' with import (even possible)?

// our one global
// default time sig is 4/4 // (we attempt to determine the time sig)
var irealb_chart_ts = '4/4';

function init() {}

function run() {
    var xml = xml_file_to_string();

    if(!xml) return;

    var qdoc = new QDomDocument();

    qdoc.setContent(xml);

    var doc = qdoc.documentElement();     

    var title = get_credit(doc, 'title');
    var composer = get_credit(doc, 'composer');

    var total_measures = doc.elementsByTagName("measure").count();
    //msg_box("total number of measures: " + total_measures);

    // returns a list of all the measures (with chords)
    var measures = iterate_each_measure_return_all(doc, total_measures)

    display_chart_irealb_format(title, composer, measures);

    return;
}

function iterate_each_measure_return_all(doc, total_measures){
  var measures = new Array;
  // iterate each measure
  for (var m = 0; m < total_measures; m++) {
      //msg_box('measure: '+m);
      var elem = doc.elementsByTagName("measure").at(m).toElement();
      if (!elem) continue;

      // is first measure, may have time sig info, get it if exists
      if (0 == m) get_meter(elem); // sets global

      // return a list of all the chords in the measure
      var chords = get_chords_in_measure(elem);
      if (!chords) continue;

      // add measure markers, e.g '|'
      // TODO
      ////var barline = get_if_repeat_sign(elem);
      //if (!barline) barline = '|';
      var barline = '|';

      // 'chords' now represents 1 complete measure (in the songs meter)
      chords.push(barline);

      //msg_box(chords);
      measures[m] = chords;

      // remove 'pickup' bar from chart
      if (0 == m) { // first measure
        if (remove_first_measure__is_pickup('right', elem)) measures[0] = '';
      }
      else if (1 == m) { // second measure
        if (remove_first_measure__is_pickup('left', elem)) measures[0] = '';
      }
  }
  return measures;
}

function display_chart_irealb_format(title, composer, measures) {
  //msg_box('measures: ' + measures);
  var chart = new Array;

  // start irealb_format
  // default key : 'C'
  // default tempo : 'Medium Swing'
  chart.push('irealbook://'+title+'='+composer+'='+'Medium Swing=C=n=[T44');

  for (var m = 0; m < measures.length; m++) {
    //msg_box('measures: ' + m + ' => ' + measures[m]);
    if (measures[m]) {
      chart.push(measures[m]);
    }
  }

  // read our plugin's UI file. (create ui dialog form)
  var loader = new QUiLoader(null);
  var file = new QFile(pluginPath+"/irealb.ui");
  file.open(QIODevice.OpenMode(QIODevice.ReadOnly, QIODevice.Text));
  form = loader.load(file,null);

  // write our music chart to dialog box
  form.irealb_format.insertPlainText(chart);
  
  //show the form (dialog)
  form.show();
}

// XXX obviously make this more robust, 
// there will be many conversions needed
function convert_to_irealb_chord(chord) {
  //chord_map = {
  //  'ma' : '^',
  //}
  //return chord.replace('ma', chord_map['ma'])

  chord = chord.replace('maj', '^');
  chord = chord.replace('Maj', '^');
  chord = chord.replace('ma', '^');
  chord = chord.replace('mi', '-');
  return chord;
}

function get_meter(elem){
  var ts = elem.elementsByTagName("time").at(0).toElement().
                elementsByTagName("beats").at(0).toElement().text();
  //msg_box('in get meter' + ts);

  // we only support quater notes as beat unit
  //var not_dur = elem.elementsByTagName("time").at(0).toElement().
  //               elementsByTagName("beats").at(0).toElement().
  //               elementsByTagName("beats-type").at(0).toElement().text();
  if (ts) irealb_chart_ts = ts.toString() + '/4';
}

function get_chords_from_harmony_root(i, elem) {
  var chord;
  var chord_root;
  var chord_acdtl = '';
  var chord_type = '';
  var slash_chord = '';
  var slash_chord_acdtl = '';

  var chord_acdtl_map = {
    '-1' : 'b',
    '1' : '#'
  }

  try {
    chord_root = elem.elementsByTagName('harmony').at(i).toElement().
                      elementsByTagName('root').at(0).toElement().
                      elementsByTagName('root-step').at(0).toElement().text();
    if (!chord_root) return;
  }
  catch(err){
    // chord root not found, 
    // the only required part of the chord, so return
    return;
  }

  try {
    chord_acdtl = elem.elementsByTagName('harmony').at(i).toElement().
                       elementsByTagName('root').at(0).toElement().
                       elementsByTagName('root-alter').at(0).toElement().text();
    if (chord_acdtl){
      chord_acdtl = chord_acdtl_map[chord_acdtl]
    }
  }
  catch(err){}

  try {
    chord_type = elem.elementsByTagName('harmony').at(i).toElement().
                      elementsByTagName('kind').at(0).toElement().
                      attribute('text');
    //msg_box(chord_type);
  }
  catch(err){
    //msg_box(err);
  }

  try {
    slash_chord = elem.elementsByTagName('harmony').at(i).toElement().
                      elementsByTagName('bass').at(0).toElement().
                      elementsByTagName('bass-step').at(0).toElement().text();
  }
  catch(err){}

  try {
    slash_chord_acdtl = elem.elementsByTagName('harmony').at(i).toElement().
                             elementsByTagName('bass').at(0).toElement().
                             elementsByTagName('bass-step').at(0).toElement().
                             elementsByTagName('bass-alter').at(0).toElement().
                             text();
    if (slash_chord_acdtl){
      slash_chord_acdtl = chord_acdtl_map[slash_chord_acdtl]
    }
  }
  catch(err){}

  chord = chord_root + chord_acdtl + chord_type;

  if (slash_chord){
    chord = chord + '/' + slash_chord + slash_chord_acdtl;
  }

  return chord;
}

function get_chords_from_direction_words(i, elem) {
  try {
    var chord = elem.elementsByTagName('direction').at(i).toElement().
                     elementsByTagName('direction-type').at(0).toElement().
                     elementsByTagName('words').at(0).toElement().text();
    // axe chars that will through off irealb chords
    //chord = chord.replace('/', ' ');
    return chord;
  }
  catch(err){
    // chord not found
  }
}

// returns the chords in the measure
function get_chords_in_measure(element) {
  var elem = element;

  var chords = new Array;

  var prev_chord;
  //iterate over beats per measure e.g. for (var i = 0; i < 4;i++){ 
  // this is one measure, 'N' num of beats (probably 4)
  for (var i = 0; i < irealb_chart_ts.split('/')[0]; i++){
    //msg_box('beat: '+i);
    try {
      // seems the MusicXML file has several ways to save chords!?
      // (or I'm doing chords in charts 'wrong')
      // seems to be the 'correct' way to denote chords
      var chord = get_chords_from_harmony_root(i, elem);
      // some of my charts chords are specified like this
      if (!chord) chord = get_chords_from_direction_words(i, elem);
      if (chord) {
        chord = convert_to_irealb_chord(chord);

        // MuseXML format, will have the same chord consecutively in a
        // measure, why?!  // 'display hack'
        if (prev_chord == chord) {
          // let's remove the first entry of the chord and keep the second
          // makes better chord/beat spacing
          chords.pop(); // remove last chord
          chords.push(' '); // replace last chord with nothing
        }
        prev_chord = chord;
      }
      else {
          chord = ' ';
      }

      //msg_box('chord: '+chord);
      chords.push(chord) // now add the chord to all chords in measure
    }
    catch(err){
       msg_box(err);
       chords.push(' ');
       continue;
    }

  }

  //msg_box(chords.length)
  //msg_box(irealb_chart_ts.split('/')[0])

  // for whatever reason we have not enough beats in the measure
  //while (chords.length < irealb_chart_ts.split('/')[0]) chords.push(' ');
  // for whatever reason we have too many beats in the measure
  //while (chords.length > irealb_chart_ts.split('/')[0]) chords.pop();

  // probably not the right thing to do
  // no chord on first beat, assume same chord as last measure 
  // (i.e iRealb repeat chord)
  if (chords[0] == ' ') chords[0] = 'x';
  if (!chords[0]) chords[0] = 'x';

  return chords;
}

// first measure contains a 'right' barline, it's a pickup measure
// second measure contains a 'left' barline, first bar is a pickup measure
function remove_first_measure__is_pickup(b_side, elem) {
  try {
    var barline = elem.elementsByTagName('barline').at(0).toElement().
                       attribute('location');

    //msg_box('check for barline: ' + barline);

    if (barline && barline == b_side) return true;
  }
  catch(err){}

  return false;
}

// is there a repeat sign in the measure?
function get_if_repeat_sign(elem) {
  try {
    var rps = elem.elementsByTagName('barline').at(0).toElement().
                           elementsByTagName('bar-style').at(0).toElement().
                           text();
    if (!rps) return;
    if (rps == 'heavy-light') return '{';
    if (rps == 'light-heavy') return '}';
  }
  catch(err){}
}


function get_credit(doc, get_cred) {
    var cred_val = 'unknown';

    var xml_mapping = {
      'title' : 0,
      'composer' : 1,
      'copyright' : 2
    };

    try {
      cred_val = doc.elementsByTagName("credit").at(xml_mapping[get_cred]).
                         toElement().text();
    } catch(err){
      //msg_box("get title error: " + err);
    }

    return cred_val;
}

function xml_file_to_string() {
    var xml_path = QDir.homePath();
    //var xml_path = '/home/dwright/Documents/Charts/Try Again.xml';

    var xmlFile = QFileDialog.getOpenFileName(this, 
                                              "MuseScore: Load MusicXML File",
                                              xml_path, "XML file (*.xml)"
                                             );
    if(!xmlFile) return;

    //read xml file
    var file = new QFile(xmlFile);

    if (!file.open(QIODevice.ReadOnly)) {       
        msg_box("cannot open file: " + xmlFile)
        return;
    }
    // file opened successfully

    // read the file
    var qTextStream = new QTextStream(file);

    var xml_str = '';
    while (!qTextStream.atEnd()) {
      xml_str += (qTextStream.readLine() + "\n");
    }

    // Close the file
    file.close();

    // return entire file as an xml string (with newlines)
    return xml_str;
}

function msg_box(s) {
    mb = new QMessageBox();
    mb.setWindowTitle("MuseScore: iRealb Plugin");
    mb.text = s;
    mb.exec();
}

//////////////////////////////////

var mscorePlugin = {
  majorVersion: 1,
  minorVersion: 1,
  menu: 'Plugins.iRealb',
  init: init,
  run:  run
};

mscorePlugin;

