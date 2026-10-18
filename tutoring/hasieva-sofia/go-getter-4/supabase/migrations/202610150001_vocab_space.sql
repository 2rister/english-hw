-- Additive Vocab Space schema; apply locally/synthetically before any cloud rollout.
alter table public.learning_units drop constraint learning_units_id_check;
alter table public.learning_units add constraint learning_units_id_check check (id in ('street-style','grammar-snack-01','vocab-space'));
insert into public.learning_units(id,title,content_version) values ('vocab-space','Vocab Space','2026-10-15.1');

create table public.vocab_sets (
  id text primary key,
  version text not null,
  definition jsonb not null check (jsonb_typeof(definition) = 'object')
);
insert into public.vocab_sets values ('unit-2-home-housework','2026-10-15.1',$vocab${"id":"unit-2-home-housework","version":"2026-10-15.1","title":"Home & Housework","days":3,"items":[{"id":"u2-001","number":1,"english":"armchair","meaning":"кресло","contexts":["The armchair is next to the window.","Dad reads in his armchair after dinner."],"tip":"Закрой образец, произнеси «armchair» и попробуй написать по памяти.","audio":"assets/audio/u2-001.mp3"},{"id":"u2-002","number":2,"english":"attic","meaning":"чердак","contexts":["There are old boxes in the attic.","We keep our winter things in the attic."],"tip":"Закрой образец, произнеси «attic» и попробуй написать по памяти.","audio":"assets/audio/u2-002.mp3"},{"id":"u2-003","number":3,"english":"basement","meaning":"подвал","contexts":["The bikes are in the basement.","Our basement is below the kitchen."],"tip":"Закрой образец, произнеси «basement» и попробуй написать по памяти.","audio":"assets/audio/u2-003.mp3"},{"id":"u2-004","number":4,"english":"bath","meaning":"ванна","contexts":["There is a big bath in the bathroom.","I have a warm bath before bed."],"tip":"Закрой образец, произнеси «bath» и попробуй написать по памяти.","audio":"assets/audio/u2-004.mp3"},{"id":"u2-005","number":5,"english":"bathroom","meaning":"ванная комната","contexts":["The bathroom is upstairs.","Please put the clean towels in the bathroom."],"tip":"Закрой образец, произнеси «bathroom» и попробуй написать по памяти.","audio":"assets/audio/u2-005.mp3"},{"id":"u2-006","number":6,"english":"bed","meaning":"кровать","contexts":["My bed is next to the window.","The cat is sleeping on the bed."],"tip":"Закрой образец, произнеси «bed» и попробуй написать по памяти.","audio":"assets/audio/u2-006.mp3"},{"id":"u2-007","number":7,"english":"bedroom","meaning":"спальня","contexts":["My bedroom has two windows.","I do my homework in my bedroom."],"tip":"Закрой образец, произнеси «bedroom» и попробуй написать по памяти.","audio":"assets/audio/u2-007.mp3"},{"id":"u2-008","number":8,"english":"carpet","meaning":"ковёр; ковровое покрытие","contexts":["There is a soft carpet on the floor.","Please take your shoes off on the carpet."],"tip":"Закрой образец, произнеси «carpet» и попробуй написать по памяти.","audio":"assets/audio/u2-008.mp3"},{"id":"u2-009","number":9,"english":"chest of drawers","meaning":"комод","contexts":["My socks are in the chest of drawers.","There is a chest of drawers next to my bed."],"tip":"Три слова: chest + of + drawers. Не потеряй of и окончание -s.","audio":"assets/audio/u2-009.mp3"},{"id":"u2-010","number":10,"english":"clean the floor","meaning":"мыть пол","contexts":["Please clean the floor with water.","I clean the floor when it is dirty."],"tip":"Закрой образец, произнеси «clean the floor» и попробуй написать по памяти.","audio":"assets/audio/u2-010.mp3"},{"id":"u2-011","number":11,"english":"clean the windows","meaning":"мыть окна","contexts":["We clean the windows every month.","Please clean the windows so we can see the garden."],"tip":"Закрой образец, произнеси «clean the windows» и попробуй написать по памяти.","audio":"assets/audio/u2-011.mp3"},{"id":"u2-012","number":12,"english":"clue","meaning":"подсказка; улика","contexts":["This note is a clue in our treasure game.","We found a clue under the table."],"tip":"Закрой образец, произнеси «clue» и попробуй написать по памяти.","audio":"assets/audio/u2-012.mp3"},{"id":"u2-013","number":13,"english":"company","meaning":"компания; фирма","contexts":["My dad works for a small company.","This company makes wooden chairs."],"tip":"Закрой образец, произнеси «company» и попробуй написать по памяти.","audio":"assets/audio/u2-013.mp3"},{"id":"u2-014","number":14,"english":"confirm","meaning":"подтверждать","contexts":["Please confirm the time of our lesson.","Can you confirm that the shop is open?"],"tip":"Закрой образец, произнеси «confirm» и попробуй написать по памяти.","audio":"assets/audio/u2-014.mp3"},{"id":"u2-015","number":15,"english":"cooker","meaning":"кухонная плита","contexts":["There is a pot on the cooker.","We use the cooker to make dinner."],"tip":"Закрой образец, произнеси «cooker» и попробуй написать по памяти.","audio":"assets/audio/u2-015.mp3"},{"id":"u2-016","number":16,"english":"cupboard","meaning":"шкаф для посуды или вещей","contexts":["The cups are in the cupboard.","Please put the plates in the cupboard."],"tip":"В cupboard буква p пишется, хотя почти не слышна. Запомни две части: cup + board.","audio":"assets/audio/u2-016.mp3"},{"id":"u2-017","number":17,"english":"curtains","meaning":"шторы","contexts":["The curtains are blue.","Please close the curtains at night."],"tip":"Закрой образец, произнеси «curtains» и попробуй написать по памяти.","audio":"assets/audio/u2-017.mp3"},{"id":"u2-018","number":18,"english":"dice","meaning":"игральные кости","contexts":["We need two dice for this board game.","Throw the dice and move your piece."],"tip":"Игральные кости — dice. Пишется c, хотя слышится /s/.","audio":"assets/audio/u2-018.mp3"},{"id":"u2-019","number":19,"english":"dining room","meaning":"столовая","contexts":["We eat together in the dining room.","The dining room has a large table."],"tip":"Закрой образец, произнеси «dining room» и попробуй написать по памяти.","audio":"assets/audio/u2-019.mp3"},{"id":"u2-020","number":20,"english":"dishwasher","meaning":"посудомоечная машина","contexts":["The plates are in the dishwasher.","Please put the dirty cups in the dishwasher."],"tip":"Одно слово: dish + washer.","audio":"assets/audio/u2-020.mp3"},{"id":"u2-021","number":21,"english":"do the ironing","meaning":"гладить бельё","contexts":["I do the ironing when my shirts are not smooth.","We do the ironing after the clothes are dry."],"tip":"Три слова. В ironing сохраняется написание iron.","audio":"assets/audio/u2-021.mp3"},{"id":"u2-022","number":22,"english":"do the shopping","meaning":"делать покупки","contexts":["We do the shopping at the supermarket.","I do the shopping with my dad on Saturdays."],"tip":"Закрой образец, произнеси «do the shopping» и попробуй написать по памяти.","audio":"assets/audio/u2-022.mp3"},{"id":"u2-023","number":23,"english":"do the washing","meaning":"стирать","contexts":["We do the washing when our clothes are dirty.","I do the washing on Saturday mornings."],"tip":"Это стирка одежды. Другая фраза, do the washing up, означает мыть посуду.","audio":"assets/audio/u2-023.mp3"},{"id":"u2-024","number":24,"english":"do the washing up","meaning":"мыть посуду","contexts":["I do the washing up after dinner.","We do the washing up when the plates are dirty."],"tip":"Это мыть посуду. Четыре слова, последнее — up.","audio":"assets/audio/u2-024.mp3"},{"id":"u2-025","number":25,"english":"dust the furniture","meaning":"вытирать пыль с мебели","contexts":["Please dust the furniture with a soft cloth.","I dust the furniture in the living room."],"tip":"Не пропускай the. Furniture пишется с -ture на конце.","audio":"assets/audio/u2-025.mp3"},{"id":"u2-026","number":26,"english":"environment","meaning":"окружающая среда","contexts":["We can help the environment by using less plastic.","Clean rivers are good for the environment."],"tip":"Разбей на части: en + viron + ment. Не пропускай n перед ment.","audio":"assets/audio/u2-026.mp3"},{"id":"u2-027","number":27,"english":"even","meaning":"даже","contexts":["Our house is so cold that even the cat wears a coat.","Everyone helps at home, even my little brother."],"tip":"Закрой образец, произнеси «even» и попробуй написать по памяти.","audio":"assets/audio/u2-027.mp3"},{"id":"u2-028","number":28,"english":"feature","meaning":"особенность; характерная черта","contexts":["The best feature of this house is its big garden.","A large window is an important feature of the room."],"tip":"Закрой образец, произнеси «feature» и попробуй написать по памяти.","audio":"assets/audio/u2-028.mp3"},{"id":"u2-029","number":29,"english":"find out","meaning":"выяснять","contexts":["We need to find out who left this note.","Can you find out when the shop opens?"],"tip":"Закрой образец, произнеси «find out» и попробуй написать по памяти.","audio":"assets/audio/u2-029.mp3"},{"id":"u2-030","number":30,"english":"fridge","meaning":"холодильник","contexts":["The milk is in the fridge.","Please put the cheese in the fridge."],"tip":"Закрой образец, произнеси «fridge» и попробуй написать по памяти.","audio":"assets/audio/u2-030.mp3"},{"id":"u2-031","number":31,"english":"full","meaning":"полный","contexts":["The bin is full of rubbish.","My bag is full of books."],"tip":"В full две l.","audio":"assets/audio/u2-031.mp3"},{"id":"u2-032","number":32,"english":"games console","meaning":"игровая приставка","contexts":["My games console is next to the TV.","We play together on the games console."],"tip":"Два слова; games обязательно с s.","audio":"assets/audio/u2-032.mp3"},{"id":"u2-033","number":33,"english":"garden","meaning":"сад","contexts":["There are flowers in the garden.","We sit in the garden when it is sunny."],"tip":"Закрой образец, произнеси «garden» и попробуй написать по памяти.","audio":"assets/audio/u2-033.mp3"},{"id":"u2-034","number":34,"english":"garage","meaning":"гараж","contexts":["Dad keeps his car in the garage.","My bike is in the garage."],"tip":"Закрой образец, произнеси «garage» и попробуй написать по памяти.","audio":"assets/audio/u2-034.mp3"},{"id":"u2-035","number":35,"english":"hall","meaning":"прихожая; холл","contexts":["Leave your shoes in the hall.","There is a mirror in the hall."],"tip":"Закрой образец, произнеси «hall» и попробуй написать по памяти.","audio":"assets/audio/u2-035.mp3"},{"id":"u2-036","number":36,"english":"historical","meaning":"исторический","contexts":["We visited a historical building in the town centre.","This historical book tells us about life long ago."],"tip":"history превращается в historical: на конце -ical.","audio":"assets/audio/u2-036.mp3"},{"id":"u2-037","number":37,"english":"housework","meaning":"работа по дому","contexts":["We share the housework in our family.","I do some housework after school."],"tip":"Закрой образец, произнеси «housework» и попробуй написать по памяти.","audio":"assets/audio/u2-037.mp3"},{"id":"u2-038","number":38,"english":"jail","meaning":"тюрьма","contexts":["The man in the story went to jail.","The old jail is now a museum."],"tip":"В jail сочетание ai.","audio":"assets/audio/u2-038.mp3"},{"id":"u2-039","number":39,"english":"kitchen","meaning":"кухня","contexts":["Mum is making lunch in the kitchen.","The kitchen has a large window."],"tip":"Закрой образец, произнеси «kitchen» и попробуй написать по памяти.","audio":"assets/audio/u2-039.mp3"},{"id":"u2-040","number":40,"english":"lake","meaning":"озеро","contexts":["There is a lake near our house.","We walk around the lake on Sundays."],"tip":"Закрой образец, произнеси «lake» и попробуй написать по памяти.","audio":"assets/audio/u2-040.mp3"},{"id":"u2-041","number":41,"english":"lamp","meaning":"лампа","contexts":["There is a small lamp on my desk.","I turn on my desk lamp to read."],"tip":"Закрой образец, произнеси «lamp» и попробуй написать по памяти.","audio":"assets/audio/u2-041.mp3"},{"id":"u2-042","number":42,"english":"lay the table","meaning":"накрывать на стол","contexts":["Please lay the table before dinner.","I lay the table with plates and glasses."],"tip":"Три слова, включая the. Для накрывания на стол — lay.","audio":"assets/audio/u2-042.mp3"},{"id":"u2-043","number":43,"english":"light","meaning":"свет; светильник","contexts":["Please turn off the light before you leave.","There is not much light in this room."],"tip":"Закрой образец, произнеси «light» и попробуй написать по памяти.","audio":"assets/audio/u2-043.mp3"},{"id":"u2-044","number":44,"english":"living room","meaning":"гостиная","contexts":["We watch films in the living room.","The sofa is in the living room."],"tip":"Закрой образец, произнеси «living room» и попробуй написать по памяти.","audio":"assets/audio/u2-044.mp3"},{"id":"u2-045","number":45,"english":"location","meaning":"местоположение","contexts":["The location of our house is perfect for school.","This hotel has a good location near the station."],"tip":"Закрой образец, произнеси «location» и попробуй написать по памяти.","audio":"assets/audio/u2-045.mp3"},{"id":"u2-046","number":46,"english":"look like","meaning":"быть похожим на","contexts":["These clouds look like animals.","What does your new house look like?"],"tip":"Закрой образец, произнеси «look like» и попробуй написать по памяти.","audio":"assets/audio/u2-046.mp3"},{"id":"u2-047","number":47,"english":"make lunch","meaning":"готовить обед","contexts":["I make lunch at twelve o'clock.","We make lunch together on Sundays."],"tip":"Закрой образец, произнеси «make lunch» и попробуй написать по памяти.","audio":"assets/audio/u2-047.mp3"},{"id":"u2-048","number":48,"english":"make dinner","meaning":"готовить ужин","contexts":["We make dinner at six o'clock.","I help my dad make dinner after school."],"tip":"Закрой образец, произнеси «make dinner» и попробуй написать по памяти.","audio":"assets/audio/u2-048.mp3"},{"id":"u2-049","number":49,"english":"make the bed","meaning":"застилать кровать","contexts":["I make the bed every morning.","Please make the bed before you go to school."],"tip":"Три слова, включая the. Говорим make the bed.","audio":"assets/audio/u2-049.mp3"},{"id":"u2-050","number":50,"english":"microwave","meaning":"микроволновая печь","contexts":["The microwave is next to the fridge.","I heat my soup in the microwave."],"tip":"Одно слово: micro + wave.","audio":"assets/audio/u2-050.mp3"},{"id":"u2-051","number":51,"english":"mirror","meaning":"зеркало","contexts":["There is a mirror above the sink.","I can see my face in the mirror."],"tip":"В mirror две r в середине: mir + ror.","audio":"assets/audio/u2-051.mp3"},{"id":"u2-052","number":52,"english":"opinion","meaning":"мнение","contexts":["In my opinion, this room is too dark.","What is your opinion of our new house?"],"tip":"Закрой образец, произнеси «opinion» и попробуй написать по памяти.","audio":"assets/audio/u2-052.mp3"},{"id":"u2-053","number":53,"english":"outside","meaning":"снаружи; вне дома","contexts":["The children are playing outside.","Please leave your muddy boots outside."],"tip":"Закрой образец, произнеси «outside» и попробуй написать по памяти.","audio":"assets/audio/u2-053.mp3"},{"id":"u2-054","number":54,"english":"phone","meaning":"телефон","contexts":["My phone is on the table.","I use my phone to call my friend."],"tip":"Закрой образец, произнеси «phone» и попробуй написать по памяти.","audio":"assets/audio/u2-054.mp3"},{"id":"u2-055","number":55,"english":"picture","meaning":"картина; изображение","contexts":["There is a picture of a lake on the wall.","I drew a picture of my bedroom."],"tip":"Закрой образец, произнеси «picture» и попробуй написать по памяти.","audio":"assets/audio/u2-055.mp3"},{"id":"u2-056","number":56,"english":"positive","meaning":"положительный","contexts":["She gave us some positive news.","I try to stay positive when work is difficult."],"tip":"Закрой образец, произнеси «positive» и попробуй написать по памяти.","audio":"assets/audio/u2-056.mp3"},{"id":"u2-057","number":57,"english":"poster","meaning":"плакат; постер","contexts":["There is a poster of my favourite band above my bed.","I put a new poster on my bedroom wall."],"tip":"Закрой образец, произнеси «poster» и попробуй написать по памяти.","audio":"assets/audio/u2-057.mp3"},{"id":"u2-058","number":58,"english":"prize","meaning":"приз","contexts":["She won a prize for her drawing.","The first prize is a new bike."],"tip":"Закрой образец, произнеси «prize» и попробуй написать по памяти.","audio":"assets/audio/u2-058.mp3"},{"id":"u2-059","number":59,"english":"radiator","meaning":"радиатор; батарея отопления","contexts":["The radiator keeps our room warm.","Please do not put your books on the radiator."],"tip":"Закрой образец, произнеси «radiator» и попробуй написать по памяти.","audio":"assets/audio/u2-059.mp3"},{"id":"u2-060","number":60,"english":"reduce","meaning":"уменьшать; сокращать","contexts":["We can reduce the amount of rubbish we make.","We want to reduce our use of plastic."],"tip":"Закрой образец, произнеси «reduce» и попробуй написать по памяти.","audio":"assets/audio/u2-060.mp3"},{"id":"u2-061","number":61,"english":"rug","meaning":"небольшой ковёр; коврик","contexts":["There is a small rug by the bed.","The dog is sleeping on the rug."],"tip":"Закрой образец, произнеси «rug» и попробуй написать по памяти.","audio":"assets/audio/u2-061.mp3"},{"id":"u2-062","number":62,"english":"save","meaning":"экономить; сберегать","contexts":["Turn off the tap to save water.","We switch off the lights to save energy."],"tip":"Закрой образец, произнеси «save» и попробуй написать по памяти.","audio":"assets/audio/u2-062.mp3"},{"id":"u2-063","number":63,"english":"shelf","meaning":"полка","contexts":["There is one shelf above my desk.","Put the book on the top shelf."],"tip":"Одна полка — shelf, с f на конце.","audio":"assets/audio/u2-063.mp3"},{"id":"u2-064","number":64,"english":"shelves","meaning":"полки","contexts":["There are two shelves above my desk.","These shelves are full of books."],"tip":"Несколько полок — shelves: f меняется на v, затем -es.","audio":"assets/audio/u2-064.mp3"},{"id":"u2-065","number":65,"english":"shower","meaning":"душ","contexts":["I have a shower every morning.","There is a shower next to the bath."],"tip":"Закрой образец, произнеси «shower» и попробуй написать по памяти.","audio":"assets/audio/u2-065.mp3"},{"id":"u2-066","number":66,"english":"sink","meaning":"раковина","contexts":["The dirty cups are in the sink.","Please wash your hands in the sink."],"tip":"Закрой образец, произнеси «sink» и попробуй написать по памяти.","audio":"assets/audio/u2-066.mp3"},{"id":"u2-067","number":67,"english":"sofa","meaning":"диван","contexts":["We sit on the sofa to watch films.","The sofa is next to the armchair."],"tip":"Закрой образец, произнеси «sofa» и попробуй написать по памяти.","audio":"assets/audio/u2-067.mp3"},{"id":"u2-068","number":68,"english":"suggestion","meaning":"предложение; идея","contexts":["My suggestion is to paint the room green.","Do you have a suggestion for our new game?"],"tip":"В suggestion две g: sug + gestion.","audio":"assets/audio/u2-068.mp3"},{"id":"u2-069","number":69,"english":"sweep the floor","meaning":"подметать пол","contexts":["Please sweep the floor with a brush.","I sweep the floor after we make things with paper."],"tip":"Закрой образец, произнеси «sweep the floor» и попробуй написать по памяти.","audio":"assets/audio/u2-069.mp3"},{"id":"u2-070","number":70,"english":"table","meaning":"стол","contexts":["There are four chairs around the table.","Put your books on the table."],"tip":"Закрой образец, произнеси «table» и попробуй написать по памяти.","audio":"assets/audio/u2-070.mp3"},{"id":"u2-071","number":71,"english":"take the rubbish out","meaning":"выносить мусор","contexts":["Please take the rubbish out when the bin is full.","I take the rubbish out after dinner."],"tip":"Четыре слова: take + the + rubbish + out. В rubbish две b.","audio":"assets/audio/u2-071.mp3"},{"id":"u2-072","number":72,"english":"tidy up","meaning":"прибираться","contexts":["Please tidy up your room before lunch.","We tidy up after we finish playing."],"tip":"Закрой образец, произнеси «tidy up» и попробуй написать по памяти.","audio":"assets/audio/u2-072.mp3"},{"id":"u2-073","number":73,"english":"toilet","meaning":"туалет","contexts":["The toilet is next to the bathroom.","Please tell me where the toilet is."],"tip":"Закрой образец, произнеси «toilet» и попробуй написать по памяти.","audio":"assets/audio/u2-073.mp3"},{"id":"u2-074","number":74,"english":"traditional","meaning":"традиционный","contexts":["This is a traditional British meal.","We play traditional games at the festival."],"tip":"В конце -tional: tradi + tional.","audio":"assets/audio/u2-074.mp3"},{"id":"u2-075","number":75,"english":"TV","meaning":"телевизор; телевидение","contexts":["We watch TV in the living room.","Please turn off the TV before bed."],"tip":"В этом комплекте обе буквы заглавные: TV.","audio":"assets/audio/u2-075.mp3"},{"id":"u2-076","number":76,"english":"unusual","meaning":"необычный","contexts":["This house has an unusual shape.","That is an unusual colour for a kitchen."],"tip":"un + usual: не пропускай вторую u.","audio":"assets/audio/u2-076.mp3"},{"id":"u2-077","number":77,"english":"vacuum the carpet","meaning":"пылесосить ковёр","contexts":["Please vacuum the carpet before our friends arrive.","I vacuum the carpet to remove the dust."],"tip":"В vacuum две u подряд. Вся фраза — vacuum + the + carpet.","audio":"assets/audio/u2-077.mp3"},{"id":"u2-078","number":78,"english":"wall","meaning":"стена","contexts":["There is a clock on the wall.","We want to paint this wall blue."],"tip":"Закрой образец, произнеси «wall» и попробуй написать по памяти.","audio":"assets/audio/u2-078.mp3"},{"id":"u2-079","number":79,"english":"wardrobe","meaning":"шкаф для одежды","contexts":["My jacket is in the wardrobe.","Put your clean clothes in the wardrobe."],"tip":"ward + robe: в конце обязательно e.","audio":"assets/audio/u2-079.mp3"},{"id":"u2-080","number":80,"english":"washing machine","meaning":"стиральная машина","contexts":["The washing machine is in the kitchen.","We put our dirty clothes in the washing machine."],"tip":"Два слова. Во втором: machine, не mashine.","audio":"assets/audio/u2-080.mp3"},{"id":"u2-081","number":81,"english":"wood","meaning":"дерево; древесина","contexts":["This table is made of wood.","We need some wood to make a shelf."],"tip":"Закрой образец, произнеси «wood» и попробуй написать по памяти.","audio":"assets/audio/u2-081.mp3"}]}$vocab$::jsonb);

create table public.vocab_attempts (
  learner_id uuid not null references public.learners(id),
  request_id uuid not null,
  session_id uuid not null,
  set_id text not null references public.vocab_sets(id),
  item_id text not null,
  content_version text not null,
  mode text not null check (mode in ('listen','context','letters','exam','paper')),
  answer text not null check (length(answer) <= 240),
  hinted boolean not null,
  correct boolean,
  self_correct boolean,
  received_at timestamptz not null default clock_timestamp(),
  primary key (learner_id, request_id),
  check ((mode = 'paper' and correct is null and self_correct is not null) or (mode <> 'paper' and correct is not null and self_correct is null))
);
create table public.vocab_progress (
  learner_id uuid not null references public.learners(id),
  set_id text not null references public.vocab_sets(id),
  item_id text not null,
  skill text not null check (skill in ('listen','context')),
  independent_attempts integer not null,
  independent_correct integer not null,
  last_correct boolean not null,
  verified_days integer not null default 0,
  next_review_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (learner_id,set_id,item_id,skill)
);
create table public.vocab_sessions (
  learner_id uuid not null references public.learners(id),
  session_id uuid not null,
  set_id text not null references public.vocab_sets(id),
  mode text not null,
  answers integer not null default 0,
  started_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (learner_id,session_id)
);
create table public.vocab_feedback (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id),
  set_id text not null references public.vocab_sets(id),
  note text not null check (length(note) between 1 and 4000),
  created_at timestamptz not null default now()
);
create table public.vocab_teacher_learners (
  teacher_auth_user_id uuid not null,
  learner_id uuid not null references public.learners(id),
  primary key (teacher_auth_user_id,learner_id)
);
alter table public.vocab_sets enable row level security;
alter table public.vocab_attempts enable row level security;
alter table public.vocab_progress enable row level security;
alter table public.vocab_sessions enable row level security;
alter table public.vocab_feedback enable row level security;
alter table public.vocab_teacher_learners enable row level security;
create policy vocab_content_read on public.vocab_sets for select using (true);
create policy vocab_teacher_own_assignment on public.vocab_teacher_learners for select to authenticated using (teacher_auth_user_id = auth.uid());

create function app.can_read_vocab(p_learner uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select p_learner = app.current_learner_id() or exists (
    select 1 from public.vocab_teacher_learners where learner_id = p_learner and teacher_auth_user_id = auth.uid()
  )
$$;
revoke all on function app.can_read_vocab(uuid) from public;
grant execute on function app.can_read_vocab(uuid) to authenticated;

create policy vocab_attempts_read on public.vocab_attempts for select to authenticated using (app.can_read_vocab(learner_id));
create policy vocab_progress_read on public.vocab_progress for select to authenticated using (app.can_read_vocab(learner_id));
create policy vocab_sessions_read on public.vocab_sessions for select to authenticated using (app.can_read_vocab(learner_id));
create policy vocab_feedback_read on public.vocab_feedback for select to authenticated using (app.can_read_vocab(learner_id));
create policy vocab_feedback_teacher_write on public.vocab_feedback for insert to authenticated with check (
  exists(select 1 from public.vocab_teacher_learners where learner_id = vocab_feedback.learner_id and teacher_auth_user_id = auth.uid())
);
grant usage on schema app to authenticated;
grant select on public.vocab_sets to anon, authenticated;
grant select on public.vocab_attempts,public.vocab_progress,public.vocab_sessions,public.vocab_feedback,public.vocab_teacher_learners to authenticated;
grant insert on public.vocab_feedback to authenticated;
-- Learners never write attempts or derived mastery directly.
revoke insert,update,delete on public.vocab_attempts,public.vocab_progress,public.vocab_sessions from anon,authenticated;

create function app.vocab_event_json(a public.vocab_attempts) returns jsonb
language sql stable as $$
 select jsonb_build_object(
   'requestId',a.request_id,'sessionId',a.session_id,'itemId',a.item_id,'version',a.content_version,
   'mode',a.mode,'answer',a.answer,'hinted',a.hinted,'correct',a.correct,'selfCorrect',a.self_correct,
   'receivedAt',a.received_at,'confirmed',true
 )
$$;
revoke all on function app.vocab_event_json(public.vocab_attempts) from public,anon,authenticated;

create function app.load_vocab(p_telegram_id bigint,p_set_id text) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
declare result jsonb;
begin
  if not exists(select 1 from public.vocab_sets where id=p_set_id) then raise exception 'Unknown set'; end if;
  if (select count(*) from public.vocab_attempts a join public.learners l on l.id=a.learner_id where l.telegram_user_id=p_telegram_id and a.set_id=p_set_id)>5000 then
    raise exception 'Attempt history needs pagination';
  end if;
  select coalesce(jsonb_agg(app.vocab_event_json(a) order by a.received_at,a.request_id),'[]'::jsonb) into result
    from public.vocab_attempts a join public.learners l on l.id=a.learner_id
    where l.telegram_user_id=p_telegram_id and a.set_id=p_set_id;
  return result;
end
$$;

create function app.record_vocab_attempt(
  p_telegram_id bigint,p_request_id uuid,p_session_id uuid,p_set_id text,p_item_id text,
  p_version text,p_mode text,p_answer text,p_hinted boolean,p_self_correct boolean default null
) returns jsonb
language plpgsql security definer set search_path = public,pg_temp as $$
declare
  learner uuid; target jsonb; content_ver text; existing public.vocab_attempts; saved public.vocab_attempts;
  expected text; normal_answer text; is_correct boolean; assisted boolean; current_skill text;
  total integer; right_count integer; last_error timestamptz; days integer;
begin
  if p_telegram_id<=0 or p_request_id is null or p_session_id is null or p_hinted is null or p_answer is null or length(p_answer)>240
    or p_mode not in ('listen','context','letters','exam','paper') or p_mode is null then raise exception 'Invalid attempt'; end if;
  select version into content_ver from public.vocab_sets where id=p_set_id;
  if content_ver is null or p_version is distinct from content_ver then raise exception 'Unknown content version'; end if;
  select word into target from public.vocab_sets s, jsonb_array_elements(s.definition->'items') word where s.id=p_set_id and word->>'id'=p_item_id;
  if target is null then raise exception 'Unknown word'; end if;
  if p_mode='paper' and p_self_correct is null then raise exception 'Paper check needs a self-report'; end if;
  if p_mode<>'paper' and (p_self_correct is not null or btrim(p_answer)='') then raise exception 'Invalid answer'; end if;
  perform pg_advisory_xact_lock(hashtextextended('vocab:'||p_telegram_id::text,0));
  insert into public.learners(telegram_user_id) values(p_telegram_id) on conflict(telegram_user_id) do update set updated_at=now() returning id into learner;
  assisted := p_hinted or p_mode='letters';
  select * into existing from public.vocab_attempts where learner_id=learner and request_id=p_request_id;
  if found then
    if existing.session_id<>p_session_id or existing.item_id<>p_item_id or existing.mode<>p_mode or existing.answer<>p_answer or existing.hinted<>assisted
       or existing.set_id<>p_set_id or existing.content_version<>p_version or existing.self_correct is distinct from p_self_correct then raise exception 'Request ID reused for a different answer'; end if;
    return app.vocab_event_json(existing);
  end if;
  expected := target->>'english';
  normal_answer := btrim(regexp_replace(normalize(p_answer,NFC),'[[:space:]]+',' ','g'));
  is_correct := case when p_mode='paper' then null when expected='TV' then normal_answer=expected else lower(normal_answer)=lower(expected) end;
  insert into public.vocab_attempts(learner_id,request_id,session_id,set_id,item_id,content_version,mode,answer,hinted,correct,self_correct)
    values(learner,p_request_id,p_session_id,p_set_id,p_item_id,p_version,p_mode,p_answer,assisted,is_correct,p_self_correct) returning * into saved;
  insert into public.vocab_sessions(learner_id,session_id,set_id,mode,answers) values(learner,p_session_id,p_set_id,p_mode,1)
    on conflict(learner_id,session_id) do update set answers=vocab_sessions.answers+1,updated_at=clock_timestamp();
  if not assisted and p_mode in ('listen','context','exam') then
    current_skill := case when p_mode='exam' then 'listen' else p_mode end;
    select count(*),count(*) filter(where correct),max(received_at) filter(where not correct) into total,right_count,last_error
      from public.vocab_attempts where learner_id=learner and set_id=p_set_id and item_id=p_item_id and not hinted
      and (case when mode='exam' then 'listen' else mode end)=current_skill;
    select case when max(received_at)-min(received_at)>=interval '12 hours'
      then count(distinct (received_at at time zone 'Europe/Moscow')::date) else least(count(*),1) end into days
      from public.vocab_attempts where learner_id=learner and set_id=p_set_id and item_id=p_item_id and not hinted and correct
      and (case when mode='exam' then 'listen' else mode end)=current_skill and (last_error is null or received_at>last_error);
    insert into public.vocab_progress values(learner,p_set_id,p_item_id,current_skill,total,right_count,is_correct,coalesce(days,0),saved.received_at+interval '1 day',saved.received_at)
      on conflict(learner_id,set_id,item_id,skill) do update set independent_attempts=excluded.independent_attempts,independent_correct=excluded.independent_correct,
      last_correct=excluded.last_correct,verified_days=excluded.verified_days,next_review_at=excluded.next_review_at,updated_at=excluded.updated_at;
  end if;
  return app.vocab_event_json(saved);
end
$$;
revoke all on function app.load_vocab(bigint,text) from public,anon,authenticated;
revoke all on function app.record_vocab_attempt(bigint,uuid,uuid,text,text,text,text,text,boolean,boolean) from public,anon,authenticated;
grant execute on function app.load_vocab(bigint,text) to service_role;
grant execute on function app.record_vocab_attempt(bigint,uuid,uuid,text,text,text,text,text,boolean,boolean) to service_role;
