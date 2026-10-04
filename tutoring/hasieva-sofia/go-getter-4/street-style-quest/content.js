window.QUEST_DATA = {
  version: 1,
  badges: [
    {id:'recall',icon:'🧠',name:'First Recall',desc:'Finish Day 1 with 70%+'},
    {id:'spell',icon:'🔤',name:'Spell Smith',desc:'Finish Day 2 with 70%+'},
    {id:'pattern',icon:'🧵',name:'Pattern Pro',desc:'Finish Day 3 with 70%+'},
    {id:'gap',icon:'🕵️',name:'Gap Detective',desc:'Finish Day 4 with 70%+'},
    {id:'sentence',icon:'✍️',name:'Sentence Stylist',desc:'Complete Day 5'},
    {id:'comeback',icon:'↩️',name:'Comeback',desc:'Correct a word after a hint'},
    {id:'voice',icon:'🎙️',name:'Voice Ready',desc:'Complete the voice mission'},
    {id:'week',icon:'🏆',name:'Quest Complete',desc:'Complete all seven days'}
  ],
  days: [
    {
      id:'day1',icon:'👗',title:'Meet the Wardrobe',short:'Meaning first: clothes, accessories and new words.',time:'20–25 min',badge:'recall',intro:'Start with meaning. Look carefully: some options are close, but only one fits the whole sentence.',
      questions:[
        {type:'mc',q:'Which item keeps your trousers in place?',options:['a belt','a tie','a scarf'],a:'a belt',hint:['It goes around your waist.','The word starts with b.']},
        {type:'mc',q:'Which word means “loose and wide, not tight”?',options:['plain','baggy','checked'],a:'baggy',hint:['Think about the shape, not the pattern.','It begins with ba-.']},
        {type:'mc',q:'Which pattern has small round marks?',options:['striped','spotted','floral'],a:'spotted',hint:['A spot is a small round mark.']},
        {type:'mc',q:'You wear these on your feet for sport.',options:['trainers','tights','earrings'],a:'trainers',hint:['They are sports shoes.']},
        {type:'mc',q:'“I noticed the new student.” What did I do?',options:['I saw and paid attention.','I forgot completely.','I laughed loudly.'],a:'I saw and paid attention.',hint:['Your eyes or mind catch something.']},
        {type:'mc',q:'Which phrase means “I do not really like it”?',options:["It’s not my cup of tea.","That’s gross!","On your own."],a:"It’s not my cup of tea.",hint:['It is an idiom about personal taste.']},
        {type:'mc',q:'Which word means “with no pattern”?',options:['plain','checked','floral'],a:'plain',hint:['One colour; no flowers, dots or lines.']},
        {type:'mc',q:'If something is ridiculous, it is…',options:['very silly or unreasonable','quiet and ordinary','carefully guided'],a:'very silly or unreasonable',hint:['It may make you say, “That makes no sense!”']},
        {type:'mc',q:'Which phrase means “without help or company”?',options:['on your own','including everyone','at a workshop'],a:'on your own',hint:['You do it by yourself.']},
        {type:'mc',q:'A guided tour has…',options:['a person who shows and explains things','no plan and no leader','only online pictures'],a:'a person who shows and explains things',hint:['A guide leads the group.']},
        {type:'mc',q:'Which word is a dark blue colour?',options:['navy','floral','modern'],a:'navy',hint:['It is a colour often used for school uniforms.']},
        {type:'mc',q:'A workshop is usually a place or event where people…',options:['learn by making or practising','sleep all afternoon','buy only food'],a:'learn by making or practising',hint:['It is active learning.']}
      ]
    },
    {
      id:'day2',icon:'🔤',title:'Spell Lab',short:'Build accurate word forms without a word bank.',time:'20–25 min',badge:'spell',intro:'Type the missing word. Spaces and capital letters do not matter, but spelling does.',
      questions:[
        {type:'type',q:'Sports shoes: t_______',a:'trainers',hint:['8 letters.','tr + ain + ers']},
        {type:'type',q:'A pattern with flowers: f______',a:'floral',hint:['6 letters.','It begins flor-.']},
        {type:'type',q:'A pattern with squares: c______',a:'checked',hint:['7 letters.','check + ed']},
        {type:'type',q:'Loose and wide clothes are b_____.',a:'baggy',hint:['5 letters.','Double the middle consonant: ba__y.']},
        {type:'type',q:'To see and pay attention to something: n_____',a:'notice',hint:['6 letters.','no + tice']},
        {type:'type',q:'Very silly or unreasonable: r_________',a:'ridiculous',hint:['10 letters.','ri-dic-u-lous']},
        {type:'type',q:'A dark blue colour: n___',a:'navy',hint:['4 letters.','n-a-v-y']},
        {type:'type',q:'Someone who makes paintings or other art: a______',a:'artist',hint:['6 letters.','art + ist']},
        {type:'type',q:'To grow or improve a skill: d______',a:'develop',hint:['7 letters.','de-vel-op']},
        {type:'type',q:'A clock or phone sound that wakes you: a____',a:'alarm',hint:['5 letters.','a-l-a-r-m']},
        {type:'type',q:'A design that repeats: p______',a:'pattern',hint:['7 letters.','Double t: pa__ern.']},
        {type:'type',q:'A large stone building for a dead person: t___',a:'tomb',hint:['4 letters.','The b is silent.']}
      ]
    },
    {
      id:'day3',icon:'🧵',title:'Style Builder',short:'Combine colour, pattern, style and clothing naturally.',time:'20–25 min',badge:'pattern',intro:'Build natural clothing phrases. English usually puts opinion/style before colour and the clothing noun last.',
      questions:[
        {type:'mc',q:'Choose the natural phrase.',options:['a striped blue shirt','a blue striped shirt','a shirt striped blue'],a:'a blue striped shirt',hint:['Colour usually comes before pattern here.']},
        {type:'mc',q:'Choose the natural phrase.',options:['baggy black trousers','black trousers baggy','trousers black baggy'],a:'baggy black trousers',hint:['Style + colour + noun.']},
        {type:'type',q:'Complete: a ______ dress with small round marks',a:'spotted',hint:['The marks are spots.']},
        {type:'type',q:'Complete: a ______ top with flowers',a:'floral',hint:['Think of flora and flowers.']},
        {type:'mc',q:'Which outfit is best for a formal school event?',options:['smart trousers and a plain shirt','baggy shorts and a hoodie','tights and trainers only'],a:'smart trousers and a plain shirt',hint:['Formal means neat, not casual.']},
        {type:'mc',q:'Which sentence is correct?',options:['She is wearing a checked skirt.','She is wearing checked a skirt.','She wearing is a checked skirt.'],a:'She is wearing a checked skirt.',hint:['Subject + be + verb-ing + noun phrase.']},
        {type:'type',q:'Complete: These trousers are not tight. They are ______.',a:'baggy',hint:['The opposite of tight in this word set.']},
        {type:'mc',q:'Which phrase has an accessory?',options:['a navy belt','a floral shirt','a plain dress'],a:'a navy belt',hint:['An accessory is added to an outfit.']},
        {type:'type',q:'Complete the collocation: ______ his alarm',a:'set',hint:['You do this before going to bed.']},
        {type:'mc',q:'Choose the correct reaction to something disgusting.',options:["That’s gross!","It’s smart!","It’s guided!"],a:"That’s gross!",hint:['Gross can mean disgusting.']},
        {type:'type',q:'Complete: The ticket price is £20, ______ lunch.',a:'including',hint:['Lunch is part of the price.']},
        {type:'type',q:'Complete: Everyone came ______ Leo.',a:'except',hint:['Leo was the only person who did not come.']}
      ]
    },
    {
      id:'day4',icon:'🕵️',title:'Gap Detective',short:'Use grammar clues instead of translating every word.',time:'20–25 min',badge:'gap',intro:'First identify the job of the gap: question word, verb, be, connector, preposition or frequency word.',
      questions:[
        {type:'mc',q:'_____ do you usually wear at weekends?',options:['What','Where','Which'],a:'What',hint:['The answer is a thing, not a place.','Use What + do + subject + verb.']},
        {type:'mc',q:'My sister _____ a checked shirt today.',options:['is wearing','wear','are wearing'],a:'is wearing',hint:['Today means now/temporary.','Sister is singular: is + verb-ing.']},
        {type:'mc',q:'This jacket is smart, _____ it is not comfortable.',options:['but','because','so'],a:'but',hint:['The two ideas contrast.']},
        {type:'mc',q:'The beach _____ a popular place in summer.',options:['is','are','do'],a:'is',hint:['The subject is singular.']},
        {type:'mc',q:'People wear coats _____ winter.',options:['in','on','at'],a:'in',hint:['Use this preposition with months and seasons.']},
        {type:'mc',q:'Which activities _____ a typical teenager do?',options:['does','is','do'],a:'does',hint:['A typical teenager = he/she/it.','Present Simple questions use does.']},
        {type:'mc',q:'She _____ goes shopping after school. It happens on most days.',options:['usually','hardly','never'],a:'usually',hint:['Most days means high frequency.']},
        {type:'mc',q:'They _____ computer games at home.',options:['play','do','go'],a:'play',hint:['This noun uses the verb play.']},
        {type:'type',q:'Complete with one word: Where _____ your brother buy his clothes?',a:'does',hint:['Present Simple question; brother = he.']},
        {type:'type',q:'Complete with one word: My trainers _____ very comfortable.',a:'are',hint:['Trainers is plural.']},
        {type:'type',q:'Complete with one word: I like this shirt _____ it is comfortable.',a:'because',hint:['The second part gives a reason.']},
        {type:'type',q:'Complete with one word: He is wearing a tie _____ a belt.',a:'and',hint:['Add one item to another.']},
        {type:'type',q:'Complete with one word: _____ colour do you prefer, navy or black?',a:'which',hint:['There is a limited choice: navy or black.']},
        {type:'type',q:'Complete with one word: She _____ not wear tights to school.',a:'does',hint:['Present Simple negative; she = does not.']}
      ]
    },
    {
      id:'day5',icon:'✍️',title:'Sentence Studio',short:'Turn words into clear, accurate sentences.',time:'20–25 min',badge:'sentence',intro:'Build complete sentences. Check subject, verb, word order and punctuation before you submit.',
      questions:[
        {type:'type',q:'Rebuild: usually / I / trainers / wear',a:'I usually wear trainers.',accept:['i usually wear trainers'],hint:['Start with the subject.','Subject + frequency word + main verb + object.']},
        {type:'type',q:'Rebuild: wearing / a / is / floral / she / dress',a:'She is wearing a floral dress.',accept:['she is wearing a floral dress'],hint:['Use Present Continuous.','She + is + wearing + noun phrase.']},
        {type:'type',q:'Rebuild: own / I / this / on / made / my',a:'I made this on my own.',accept:['i made this on my own'],hint:['The phrase goes at the end.']},
        {type:'type',q:'Rebuild: alarm / he / seven / his / at / sets',a:'He sets his alarm at seven.',accept:['he sets his alarm at seven'],hint:['He needs -s on the Present Simple verb.']},
        {type:'type',q:'Rebuild: except / everyone / Maya / came',a:'Everyone came except Maya.',accept:['everyone came except maya'],hint:['Except introduces the one person outside the group.']},
        {type:'type',q:'Rebuild: cup / not / tea / my / it’s / of',a:"It’s not my cup of tea.",accept:["it's not my cup of tea","its not my cup of tea"],hint:['It begins with It’s.']},
        {type:'mc',q:'Choose the best description.',options:['He is wearing a smart navy shirt and plain trousers.','He wearing smart a navy shirt and trouser plain.','He wears now a navy smart shirts.'],a:'He is wearing a smart navy shirt and plain trousers.',hint:['Look for be + verb-ing and natural adjective order.']},
        {type:'mc',q:'Choose the sentence with the clearest meaning.',options:['The workshop helps young artists develop their skills.','The workshop develop young artist skill.','Young artists helps workshop their skills.'],a:'The workshop helps young artists develop their skills.',hint:['The singular subject workshop needs helps.']},
        {type:'writing',q:'Write 4–5 sentences about an outfit you would wear to a school event.',checks:['I used at least four clothing words.','I used two pattern, style or colour words.','I checked is/are and verb endings.','I read my answer aloud.'],minWords:28},
        {type:'writing',q:'Write 3 sentences using these ideas: not my cup of tea · on my own · notice.',checks:['Each phrase has its own complete sentence.','The sentence meaning makes the phrase clear.','I checked spelling and punctuation.'],minWords:24}
      ]
    },
    {
      id:'day6',icon:'↩️',title:'Transfer Challenge',short:'Retrieve old words in new contexts after a delay.',time:'20–25 min',badge:null,intro:'No word bank now. These words return in new situations so your memory has to do the work.',
      questions:[
        {type:'type',q:'One word: a design of lines on clothes',a:'striped',hint:['The lines are stripes.']},
        {type:'type',q:'One word: neat and suitable for a formal situation',a:'smart',hint:['It can describe clothes or a clever person.']},
        {type:'type',q:'One word: to improve or grow a skill',a:'develop',hint:['de-vel-op']},
        {type:'type',q:'Complete: I did the whole project on my ______.',a:'own',hint:['The phrase means without help.']},
        {type:'mc',q:'I did not see the sign at first, but then I _____ it.',options:['noticed','included','guided'],a:'noticed',hint:['You suddenly saw and paid attention.']},
        {type:'mc',q:'The museum is open every day _____ Monday.',options:['except','including','during'],a:'except',hint:['Monday is the only day outside the group.']},
        {type:'mc',q:'The price is £15, _____ a guided tour.',options:['including','except','on your own'],a:'including',hint:['The tour is part of the price.']},
        {type:'mc',q:'Which sentence is correct?',options:['Does she usually wear tights?','Do she usually wears tights?','Is she usually wear tights?'],a:'Does she usually wear tights?',hint:['Does + subject + base verb.']},
        {type:'type',q:'Complete: What _____ he usually wear?',a:'does',hint:['Present Simple question; he.']},
        {type:'type',q:'Complete: The shoes _____ new, but the belt is old.',a:'are',hint:['Shoes is plural.']},
        {type:'mc',q:'Choose the best connector: The jacket looks ridiculous, _____ I will not buy it.',options:['so','because','but'],a:'so',hint:['The second idea is the result.']},
        {type:'mc',q:'Choose the best phrase: I dislike horror films. They are _____.',options:['not my cup of tea','on my own','checked and striped'],a:'not my cup of tea',hint:['Use the idiom about taste.']}
      ]
    },
    {
      id:'day7',icon:'🎙️',title:'Boss Level & Voice Booth',short:'Mix everything, then speak without a script.',time:'20–25 min',badge:'voice',intro:'Final mission: a mixed check followed by a 60–90 second voice challenge. Your recording never leaves this device.',
      questions:[
        {type:'mc',q:'Choose the correct sentence.',options:['She is wearing a baggy checked shirt.','She wearing is a checked baggy shirt.','She does wearing a baggy shirt.'],a:'She is wearing a baggy checked shirt.',hint:['Present Continuous: subject + be + verb-ing.']},
        {type:'type',q:'Complete: _____ do you prefer, the floral top or the plain one?',a:'which',hint:['There are two choices.']},
        {type:'type',q:'Complete: My brother _____ his alarm at 7:00 every day.',a:'sets',hint:['Present Simple; brother = he.']},
        {type:'mc',q:'Which word is spelled correctly?',options:['ridiculous','ridiculus','rediculous'],a:'ridiculous',hint:['ri-dic-u-lous']},
        {type:'mc',q:'Which word is spelled correctly?',options:['pattern','patern','pattren'],a:'pattern',hint:['Double t.']},
        {type:'type',q:'Complete: The trip costs £30, _____ lunch and a guided tour.',a:'including',hint:['Both are part of the price.']},
        {type:'mc',q:'Choose the best connector: I bought the trainers _____ they were comfortable.',options:['because','but','so'],a:'because',hint:['The second part gives the reason.']},
        {type:'type',q:'Complete: These tights _____ navy, not black.',a:'are',hint:['Tights is grammatically plural.']},
        {type:'speaking',q:'Voice challenge: describe two outfits and say which one you prefer.',prompts:['Use at least six clothing words.','Use three style, pattern or colour words.','Use because, but or so.','Use one new phrase: not my cup of tea, on my own, including or except.','Speak for 60–90 seconds without reading a full script.']}
      ]
    }
  ]
};
