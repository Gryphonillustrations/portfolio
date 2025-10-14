(function(storyContent) {

    // Create ink story from the content using inkjs
    var story = new inkjs.Story(storyContent);

    var savePoint = "";
    var autoscroll = false;
    //let savedTheme;
    let globalTagTheme;

    // Global tags - those at the top of the ink file
    // We support:
    //  # theme: dark
    //  # author: Your Name
/*    var globalTags = story.globalTags;
    if( globalTags ) {
        for(var i=0; i<story.globalTags.length; i++) {
            var globalTag = story.globalTags[i];
            var splitTag = splitPropertyTag(globalTag);

            // THEME: dark
            if( splitTag && splitTag.property == "theme" ) {
                globalTagTheme = splitTag.val;
            }

            // author: Your Name
            else if( splitTag && splitTag.property == "author" ) {
                var byline = document.querySelector('.byline');
                byline.innerHTML = "by "+splitTag.val;
            }
        }
    }
*/



    var storyContainer = document.querySelector('#story');
    var outerScrollContainer = document.querySelector('.outerContainer');

    // page features setup
    //setupTheme(globalTagTheme);
    var hasAchievements = loadPrevAchs();
    console.log(hasAchievements + ' about the achievements...')
    var hasSave = loadSavePoint();
    setupButtons(hasSave);

    

    if (window.localStorage.getItem('animpreference') != undefined && window.localStorage.getItem('animpreference') != null) {
        flipautoscroll(false)
    }

    // Set initial save point
    savePoint = story.state.toJson();
    if (hasAchievements) {
        displayPrevAchs();
    }

    if (hasSave) {
        loadOrRestart();
    } else {
        // Kick off the start of the story!
        continueStory(true);
    }


    // Main story processing function. Each time this is called it generates
    // all the next content up as far as the next set of choices.
    function continueStory(firstTime) {


        var paragraphIndex = 0;
        var delay = 0.0;
        var noimageyay = true

        // Don't over-scroll past new content
        var previousBottomEdge = firstTime ? 0 : contentBottomEdgeY();

        //if (firstTime == false) {
            //document.getElementById("headertop").style.display = none
        //}

        // Generate story text - loop through available content
        while(story.canContinue) {

            // Get ink to generate the next paragraph
            var paragraphText = story.Continue();
            var tags = story.currentTags;

            // Any special tags included with this line
            var customClasses = [];
            for(var i=0; i<tags.length; i++) {
                var tag = tags[i];

                // Detect tags of the form "X: Y". Currently used for IMAGE and CLASS but could be
                // customised to be used for other things too.
                var splitTag = splitPropertyTag(tag);
				splitTag.property = splitTag.property.toUpperCase();

                // AUDIO: src
                if( splitTag && splitTag.property == "AUDIO" ) {
                  if('audio' in this) {
                    this.audio.pause();
                    this.audio.removeAttribute('src');
                    this.audio.load();
                  }
                  this.audio = new Audio(splitTag.val);
                  this.audio.play();
                }

                // AUDIOLOOP: src
                else if( splitTag && splitTag.property == "AUDIOLOOP" ) {
                  if('audioLoop' in this) {
                    this.audioLoop.pause();
                    this.audioLoop.removeAttribute('src');
                    this.audioLoop.load();
                  }
                  this.audioLoop = new Audio(splitTag.val);
                  this.audioLoop.play();
                  this.audioLoop.loop = true;
                }

                // IMAGE: src
                if( splitTag && splitTag.property == "IMAGE" ) {
                    noimageyay = false
                    var imageElement = document.createElement('img');
                    imageElement.src = splitTag.val;
                    storyContainer.appendChild(imageElement);

                    imageElement.onload = () => {
                        console.log(`oop we got a image! waiting to scroll...`)
                        scrollDown(previousBottomEdge)
                    
                    }

                    showAfter(delay, imageElement);
                    delay += 200.0;
                }

                // LINK: url
                else if( splitTag && splitTag.property == "LINK" ) {
                    window.location.href = splitTag.val;
                }

                // LINKOPEN: url
                else if( splitTag && splitTag.property == "LINKOPEN" ) {
                    window.open(splitTag.val);
                }

                // BACKGROUND: src
                else if( splitTag && splitTag.property == "BACKGROUND" ) {
                    outerScrollContainer.style.backgroundImage = 'url('+splitTag.val+')';
                }

                // CLASS: className
                else if( splitTag && splitTag.property == "CLASS" ) {
                    customClasses.push(splitTag.val);
                }

                // CLEAR - removes all existing content.
                // RESTART - clears everything and restarts the story from the beginning
                else if( tag == "CLEAR" || tag == "RESTART" ) {
                    removeAll("p");
                    removeAll("img");
                    

                    // Comment out this line if you want to leave the header visible when clearing
                    //setVisible(".header", false);

                    if( tag == "RESTART" ) {
                        restart();
                        document.getElementById("fromsavenotif").innerHTML = ""
                        return;
                    }
                }
            }
		
		// Check if paragraphText is empty
		if (paragraphText.trim().length == 0) {
                continue; // Skip empty paragraphs
		}

            // Create paragraph element (initially hidden)
            var paragraphElement = document.createElement('p');
            paragraphElement.innerHTML = paragraphText;
            storyContainer.appendChild(paragraphElement);

            // Add any custom classes derived from ink tags
            for(var i=0; i<customClasses.length; i++)
                paragraphElement.classList.add(customClasses[i]);

            // Fade in paragraph after a short delay
            showAfter(delay, paragraphElement);
            delay += 200.0;
        }

        // Create HTML choices from ink choices
        story.currentChoices.forEach(function(choice) {

            // Create paragraph with anchor element
            var choiceTags = choice.tags;
            var customClasses = [];
            var isClickable = true;
            for(var i=0; i<choiceTags.length; i++) {
                var choiceTag = choiceTags[i];
                var splitTag = splitPropertyTag(choiceTag);
				splitTag.property = splitTag.property.toUpperCase();

                if(choiceTag.toUpperCase() == "UNCLICKABLE"){
                    isClickable = false
                }

                if( splitTag && splitTag.property == "CLASS" ) {
                    customClasses.push(splitTag.val);
                }

            }

            
            var choiceParagraphElement = document.createElement('p');
            choiceParagraphElement.classList.add("choice");

            for(var i=0; i<customClasses.length; i++)
                choiceParagraphElement.classList.add(customClasses[i]);

            if(isClickable){
                choiceParagraphElement.innerHTML = `<a href='#'>${choice.text}</a>`
            }else{
                choiceParagraphElement.innerHTML = `<span class='unclickable'>${choice.text}</span>`
            }
            storyContainer.appendChild(choiceParagraphElement);

            // Fade choice in after a short delay
            showAfter(delay, choiceParagraphElement);
            delay += 200.0;





            // Click on choice
            if(isClickable){
                var choiceAnchorEl = choiceParagraphElement.querySelectorAll("a")[0];
                choiceAnchorEl.addEventListener("click", function(event) {

                    // Don't follow <a> link
                    event.preventDefault();

                    // Extend height to fit
                    // We do this manually so that removing elements and creating new ones doesn't
                    // cause the height (and therefore scroll) to jump backwards temporarily.
                    storyContainer.style.height = contentBottomEdgeY()+"px";

                    // Remove all existing choices
                    removeAll(".choice");

                    // Tell the story where to go next
                    story.ChooseChoiceIndex(choice.index);

                    // This is where the save button will save from
                    savePoint = story.state.toJson();

                    // Aaand loop
                    continueStory();
                });
            }
        });

		// Unset storyContainer's height, allowing it to resize itself
		storyContainer.style.height = "";

        if( !firstTime ) {
            if (noimageyay) 
                scrollDown(previousBottomEdge);
        }
        checkAch();
		//make em have our images that alternate <3
		let choiceElementList = document.getElementsByClassName("choice")
        if (choiceElementList.length == 1) {
                choiceElementList[0].className += " choicesolo lastchoice"
        }
		else {
            let alternateArray = [" choicelefta", " choicerighta", " choiceleftb", " choicerightb"]
            let alternateNum = 0
            //console.log("atarting at alternate number " + alternateNum)
            for (let i=0; i<choiceElementList.length; i++) {
                //console.log("alternating to number " + alternateNum + "bc choice list is length of " + choiceElementList.length)
                choiceElementList[i].className += alternateArray[alternateNum]
                alternateNum += 1
                //console.log("alternat number is now " + alternateNum)
                if (alternateNum > 3) {
                    alternateNum = 0
                    //console.log("alternat number is reset to " + alternateNum)
                }

                if (i == choiceElementList.length - 1) {
                    choiceElementList[i].className += " lastchoice"
                }
            }
        }




    }

    function restart() {
        story.ResetState();

        setVisible(".header", true);
        document.getElementById("achievementscontainer").style.display = "none";

        // set save point to here
        savePoint = story.state.toJson();

        continueStory(true);

        outerScrollContainer.scrollTo(0, 0);
    }

    function restartAtEnd() {
        finalThread = document.getElementById('restartatend')
        finalThread.addEventListener("click", function(event) {
                    // Don't follow <a> link
                    event.preventDefault();
                    removeAll("p");
                    removeAll("img");
                    setVisible(".header", false);
                    restart();
                });

        
    }



    // -----------------------------------
    // Various Helper functions
    // -----------------------------------

    // Detects whether the user accepts animations
    function isAnimationEnabled() {
        return window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    }

    // Fades in an element after a specified delay
    function showAfter(delay, el) {
        if( isAnimationEnabled() ) {
            el.classList.add("hide");
            setTimeout(function() { el.classList.remove("hide") }, delay);
        } else {
            // If the user doesn't want animations, show immediately
            el.classList.remove("hide");
        }
    }

    // Scrolls the page down, but no further than the bottom edge of what you could
    // see previously, so it doesn't go too far.
    function scrollDown(previousBottomEdge) {
        // If the user doesn't want animations, let them scroll manually
        if ( !isAnimationEnabled() || !autoscroll) {
            return;
        }

        // Line up top of screen with the bottom of where the previous content ended
        var target = previousBottomEdge;

        // Can't go further than the very bottom of the page
        var limit = outerScrollContainer.scrollHeight - outerScrollContainer.clientHeight + 30;
        //console.log(`target is {}; limit is {}`, target, limit);
        //if( target < limit ) target = limit;
        target = limit;
        //console.log(`we SCROLLIN to ` + target)

        var start = outerScrollContainer.scrollTop;

        var dist = target - start;
        var duration = 300 + 300*dist/100;
        var startTime = null;
        function step(time) {
            if( startTime == null ) startTime = time;
            var t = (time-startTime) / duration;
            var lerp = 3*t*t - 2*t*t*t; // ease in/out
            outerScrollContainer.scrollTo(0, (1.0-lerp)*start + lerp*target);
            if( t < 1 ) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // The Y coordinate of the bottom end of all the story content, used
    // for growing the container, and deciding how far to scroll.
    function contentBottomEdgeY() {
        //console.log(document.querySelector('#story').lastElementChild.offsetTop + document.querySelector('#story').lastElementChild.offsetTop + 20)
        var bottomElement = storyContainer.lastElementChild;
        //console.log(`bottomElement is equal to `+ String(Number(bottomElement.offsetTop) + Number(bottomElement.offsetHeight) + 20))
        return bottomElement ? bottomElement.offsetTop + bottomElement.offsetHeight + 20 : 0;

    }

    // Remove all elements that match the given selector. Used for removing choices after
    // you've picked one, as well as for the CLEAR and RESTART tags.
    function removeAll(selector)
    {
        var allElements = storyContainer.querySelectorAll(selector);
        for(var i=0; i<allElements.length; i++) {
            var el = allElements[i];
            el.parentNode.removeChild(el);
        }
    }

    // Used for hiding and showing the header when you CLEAR or RESTART the story respectively.
    function setVisible(selector, visible)
    {
        var allElements = storyContainer.querySelectorAll(selector);
        for(var i=0; i<allElements.length; i++) {
            var el = allElements[i];
            if( !visible )
                el.classList.add("invisible");
            else
                el.classList.remove("invisible");
        }
    }

    // Helper for parsing out tags of the form:
    //  # PROPERTY: value
    // e.g. IMAGE: source path
    function splitPropertyTag(tag) {
        var propertySplitIdx = tag.indexOf(":");
        if( propertySplitIdx != null ) {
            var property = tag.substr(0, propertySplitIdx).trim();
            var val = tag.substr(propertySplitIdx+1).trim();
            return {
                property: property,
                val: val
            };
        }

        return null;
    }

    function createLoadOption(id, text) {
        var choiceParagraphElement = document.createElement('p');
        choiceParagraphElement.classList.add("choice");
        choiceParagraphElement.classList.add("choicesolo");

        choiceParagraphElement.innerHTML = `<a href='#' id="${id}">${text}</a>`;
        return choiceParagraphElement;
    }

    function loadOrRestart() {
        try {
            let savedState = window.localStorage.getItem('save-state');
            if (savedState) {
                //console.log( "ok we has a save!")
                let restartButton = createLoadOption("restart", "Restart Story from Beginning");
                let loadButton = createLoadOption("load", "Load Story from Save");

                storyContainer.appendChild(loadButton);
                storyContainer.appendChild(restartButton);
                
                loadButton.addEventListener("click", function(event) {
                    event.preventDefault();
                    storyContainer.style.height = contentBottomEdgeY()+"px";
                    removeAll(".choice");
                    story.state.LoadJson(savedState);
                    continueStory(true);
                });
                restartButton.addEventListener("click", function(event) {
                    event.preventDefault();
                    storyContainer.style.height = contentBottomEdgeY()+"px";
                    removeAll(".choice");
                    restart();
                });
            } 
        } catch (e) {
            console.debug("Couldn't find/load a save state. Starting from scratch :-)");
        }
    }

    // Loads save state if exists in the browser memory
    function loadSavePoint() {

        try {
            let savedState = window.localStorage.getItem('save-state');
            if (savedState) {
                console.log( "has a save!")
                return true;
            }
        } catch (e) {
            console.debug("Couldn't load save state");
            //document.getElementById("fromsavenotif").innerHTML = ""
        }
        return false;
    }

    // Detects which theme (light or dark) to use
   /* function setupTheme(globalTagTheme) {

        // load theme from browser memory
        var savedTheme;
        try {
            savedTheme = window.localStorage.getItem('theme');
        } catch (e) {
            console.debug("Couldn't load saved theme");
        }

        // Check whether the OS/browser is configured for dark mode
        var browserDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark"
            || (savedTheme == undefined && globalTagTheme === "dark")
            || (savedTheme == undefined && globalTagTheme == undefined && browserDark))
            document.body.classList.add("dark");
    }*/

    // Used to hook up the functionality for global functionality buttons
    function setupButtons(hasSave) {

        let rewindEl = document.getElementById("rewind");
        if (rewindEl) rewindEl.addEventListener("click", function(event) {
            removeAll("p");
            removeAll("img");
            setVisible(".header", false);
            restart();
        });

        let saveEl = document.getElementById("save");
        if (saveEl) saveEl.addEventListener("click", function(event) {
            try {
                window.localStorage.setItem('save-state', savePoint);
                document.getElementById("reload").removeAttribute("disabled");
                console.log("state saved!")
                //window.localStorage.setItem('theme', document.body.classList.contains("dark") ? "dark" : "");
            } catch (e) {
                console.warn("Couldn't save state");
            }

        });

        let reloadEl = document.getElementById("reload");
        if (!hasSave) {
            reloadEl.setAttribute("disabled", "disabled");
        }
        reloadEl.addEventListener("click", function(event) {
            if (reloadEl.getAttribute("disabled"))
                return;

            removeAll("p");
            removeAll("img");
            document.getElementById("achievementscontainer").style.display = "none";
            try {
                let savedState = window.localStorage.getItem('save-state');
                if (savedState) story.state.LoadJson(savedState);
            } catch (e) {
                console.debug("Couldn't load save state");
            }
            continueStory(true);
        });

        let animEl = document.getElementById("animtoggle");
       
        if (animEl) animEl.addEventListener("click", function(event) {
            flipautoscroll(true)
        });

        //let themeSwitchEl = document.getElementById("theme-switch");
        //if (themeSwitchEl) themeSwitchEl.addEventListener("click", function(event) {
        //    document.body.classList.add("switched");
        //    document.body.classList.toggle("dark");
        //});
    }

    function flipautoscroll(flip) {
        let animEl = document.getElementById("animtoggle");
        let animpreference = window.localStorage.getItem('animpreference')
            //console.log(window.localStorage.getItem('animpreference'))
            //console.log("starts with uhhhh " + autoscroll + "and " + animpreference)
            if (animpreference != null && animpreference != undefined) {
                if (animpreference == "true") {
                    autoscroll = true;
                } else {
                    autoscroll = false;
                }
                console.log(typeof autoscroll)
                //console.log("storage was NOT null - " + animpreference + " - so we are??" + autoscroll)
            }
            if (flip) {
                autoscroll = !autoscroll
            }
            
            //console.log("flipped autoscroll so it is now " + autoscroll)
            let textbutton = "autoscroll ";
            let titlething = "Toggle autoscrolling when a choice is selected; currently "
            if (autoscroll) {
                textbutton += "on";
                titlething += "on";
            } else {
                textbutton += "off";
                titlething += "off";
            }

            try {
                window.localStorage.setItem('animpreference', autoscroll);
                animEl.innerText = textbutton
                animEl.title = titlething
                console.log("stored preference yay")
                
            } catch (e) {
                console.warn("Couldn't save autoscroll pref");
                //animEl.innerText = "autoscroll off";
                animEl.innerText = textbutton
                animEl.title = titlething
            }
    }

    function getAchImage(id, placement, title) {
        if (title.includes("Bird")) {
            return `<div class="achbox ach${placement}" title="${title}"> <img id="achs-${id}" src="achs-${id}.png" class="achmouse" title="${title}"> </div>`
        } else{
            return `<div class="achbox ach${placement}" title="${title}"> <img id="achs-${id}" src="achs-${id}.png" class="achimg achmouse" title="${title}"> <img src="achs-ribbon.png" class="achribbon"> </div>`
        }
    }

    function getMiniAchImage(id, title) {
        if (id == "nut") {
            return `<img id="miniachs-nut" class="achmouse birdnut" src="achs-nut.png" title="Fed the Birds">`
        } else  if (id == "friend") {
            return `<img id="miniachs-friend" class="achmouse birdfriend" src="achs-friend.png" title="Made New Bird Friends">`
        }
        return `<div class="minibox"><img id="miniachs-${id}" class="achimg achmouse" src="achs-${id}.png" title="${title}"></div>`
    }

    let fullAchArray = {
        "Completed": "spool",
        "Did You": "notfound",
        "Found a Mystery": "mystery",
        "Former": "break",
        "Nothing": "jaryay",
        "Got Help": "help",
        "Library": "library",
        "Took a Nap": "snz",
        "Forgotten": "forgottea",
        "Same Drink": "samesies",
        "Tasty Tea" : "alltea"
    }

    function checkAch() {
        let achlistEl = document.getElementsByClassName("achievementslist")
        //console.log(achEls)
        if (achlistEl.length > 0){
            //console.log(achEls[0].innerText)
            achlistEl = achlistEl[0]
        
            let achArrayList = Object.getOwnPropertyNames(fullAchArray);
            

            let achimages = ""
            achTextArray = achlistEl.innerText.split("/")
            let placement = 1;
            console.log("found achievements!! " + achTextArray)
            //console.log("nameslist= " + achArrayList)
            let allAchievements = {}
            if (hasAchievements) {
                allAchievements = JSON.parse(window.localStorage.getItem('prev-achievements'));
            }

            if (achTextArray.length == 4) {
                placement = 2
            } else if (achTextArray.length == 5 && achlistEl.innerText.includes("Fed")) {
                placement = 2
            }

            for (let i=0; i<achTextArray.length; i++) {
                let ach = achTextArray[i]
                let thisAchId = "";
                //console.log(ach)

                if (achTextArray.length - 1 == i) {
                    if (ach.includes("Fed")) {
                        achimages += getAchImage("nut", "-nut", ach)
                        thisAchId = "nut";

                    } else {
                        achimages += getAchImage("friend", "-friend", ach)
                        thisAchId = "friend";
                    }
                }

                else {
                    for (let j=0; j<achArrayList.length; j++) {
                        if (ach.includes(achArrayList[j])) {
                            thisAchId = fullAchArray[achArrayList[j]];
                            achArrayList.splice(j, 1);
                            break;
                        }
                    }
                    achimages += getAchImage(thisAchId, placement, ach);
                }
                placement += 1;
                try {
                    allAchievements[thisAchId] = ach;
                } catch (e) {
                    console.log("damn,,, bad game")
                }
                
                console.log(allAchievements)

            }

            try {
                window.localStorage.setItem('prev-achievements', JSON.stringify(allAchievements));
                console.log('Achievements saved!');
                displayPrevAchs();
                hasAchievements = true;
            } catch (e) {
                console.log("couldn't save achievements uh oh!");
            }

            let achBoxEl = document.getElementById("achievementscontainer");
            let els = achBoxEl.getElementsByClassName("achbox");
            while (els.length > 0) {
                achBoxEl.removeChild(els[0]);
            }

            achBoxEl.innerHTML += achimages + `<br> <br> <br> <br>`;
            achBoxEl.style.display = "block";
            restartAtEnd();

            els = achBoxEl.getElementsByClassName("achbox");
            let info = document.getElementsByClassName("achinfohelp")[0]
            for (let i=0; i< els.length; i++) {
                let element = els[i] 
                element.addEventListener("mouseenter", function(event) {
                    console.log(element.title)
                    info.innerHTML = element.title;
                    info.className = "achinfo";
                })
                element.addEventListener("mouseleave", function(event) {
                    info.innerHTML = "mouse over the images to view your path"
                    info.className = "achinfohelp";
                })
            }
        }
    }

    function displayPrevAchs() {
        //console.log("TRYING TO DISPLAY")
        let achievements = JSON.parse(window.localStorage.getItem('prev-achievements'));
        let info = document.getElementsByClassName("prevlabel")[0]
        info.innerHTML = "Previous Paths";
        let idKeys = Object.getOwnPropertyNames(achievements);
        let miniAchievements = ""
        let potentialfriend = ""
        for (let i=0; i<idKeys.length; i++) {
            if (idKeys[i] == "nut" ) {
                miniAchievements = getMiniAchImage("nut", "ignore") + miniAchievements
                //document.getElementById("miniachs-nut").innerHTML = `<img id="miniachs-nut" class="achmouse birdmini birdnut" src="achs-nut.png" title="Fed the Birds">`
                //document.getElementById("bird1").innerHTML =  `<div class="birdbox minibox"><img id="miniachs-nut" class="achimg" src="achs-nut.png" title="Fed the Birds"></div>`
            } else if (idKeys[i] == "friend") {
                potentialfriend = getMiniAchImage("friend", "ignore")
                //document.getElementById("miniachs-friend").innerHTML = `<img id="miniachs-friend" class="achmouse birdmini birdfriend" src="achs-friend.png" title="Made New Bird Friends">`
                
                 //document.getElementById("bird2").innerHTML =  `<div class="birdbox minibox"><img id="miniachs-friend" class="achimg" src="achs-friend.png" title="Made New Bird Friends"></div>`
            }
            else {
                miniAchievements += getMiniAchImage(idKeys[i], achievements[idKeys[i]])
            }
        }
        document.getElementById("prevachievements").innerHTML = miniAchievements + potentialfriend
        
        els = document.getElementsByClassName("achmouse");
        info = document.getElementsByClassName("prevlabel")[0]
        console.log(els.length)
        for (let i=0; i< els.length; i++) {
            let element = els[i] 
            element.addEventListener("mouseenter", function(event) {
                console.log(element.title)
                info.innerHTML = element.title;
            })
            element.addEventListener("mouseleave", function(event) {
                info.innerHTML = "Previous Paths";
            })
        }
    }

    function loadPrevAchs() {
        //console.log('trying to find achievements storage')
          try {
            let achievements = window.localStorage.getItem('prev-achievements');
            if (achievements) {
                console.log( "has previous achievements!")
                return true;
            }
        } catch (e) {
            console.debug("Couldn't load saved achievements sad");
        }
        return false;
    }

    

})(storyContent);

//matters if 4 or 5 ach, otherwise do em in sequence <3! 
//let four = [2, 3, 4, "bird"]
//let five = [1, 2, 3, 4, "friend"] // OR [2, 3, 4, 5, "nuts"]
//let six = [1, 2, 3, 4, 5, "bird"]
//let sev = [1, 2, 3, 4, 5, 6, "bird"]
