# Bangla review (Desk Watch)

Every Bangla line in the app, next to its English. **Correct only the last column (বাংলা)** and keep:
- the words in curly brackets exactly as they are (`{name}`, `{n}`, `{time}`…): the app fills them in;
- "Desk Watch", Chrome, Edge, Windows and web addresses in English.

Numbers are turned into Bangla digits by the app itself, and dates and weekday names come from the built-in Bangla
calendar names, so they are not in this list. The Debug tab stays in English.

When you are done, tell Claude, or run `node scripts/bangla-review.mjs import` and then `npm test`.
"Where" is the file the line is used in (Study = Study tab, Todo = the to-do list, Focus = Focus mode, and so on).

787 lines. Made by `node scripts/bangla-review.mjs`.

| # | Where | English | বাংলা |
|---|---|---|---|
| 1 | App, Routines | Study | পড়া |
| 2 | App, setup | Planner | পরিকল্পনা |
| 3 | App, setup | History | ইতিহাস |
| 4 | App | Settings | সেটিংস |
| 5 | App | Help | সাহায্য |
| 6 | App | Main | প্রধান |
| 7 | Alarm | The alarm stops by itself when you are back. | আপনি ফিরে এলে অ্যালার্ম নিজে থেকেই থেমে যাবে। |
| 8 | Focus, Study | Take a {min} min break instead | বরং {min} মিনিটের Break নিন |
| 9 | Focus | Hold Esc to exit | বের হতে Esc চেপে ধরুন |
| 10 | todo | {done} min focused | {done} মিনিট মনোযোগ |
| 11 | todo | {done} of {est} min | {est} মিনিটের মধ্যে {done} মিনিট |
| 12 | todo | +{over} min over | {over} মিনিট বেশি |
| 13 | App | Tour of this screen | এই পাতার পরিচিতি |
| 14 | App | End your session first | আগে Session শেষ করুন |
| 15 | App | Run setup again | আবার সেটআপ চালান |
| 16 | App | Camera images stay on this computer. Nothing is recorded or sent, except test clips you record yourself. | ক্যামেরার ছবি এই কম্পিউটারেই থাকে। কিছুই রেকর্ড বা পাঠানো হয় না, শুধু আপনি নিজে যে টেস্ট ক্লিপ রেকর্ড করেন সেগুলো ছাড়া। |
| 17 | engine | The {model} model failed: {error} | {model} মডেল কাজ করেনি: {error} |
| 18 | engine | The {model} model stopped: {error} | {model} মডেল থেমে গেছে: {error} |
| 19 | engine | Could not load the detection models: {error} | শনাক্ত করার মডেলগুলো চালু করা গেল না: {error} |
| 20 | Calibrate | Write in your notebook, as you normally do | খাতায় লিখুন, যেমন সাধারণত লেখেন |
| 21 | Calibrate | Read your book or notes on the desk | টেবিলে রাখা বই বা নোট পড়ুন |
| 22 | Calibrate | Sit still and think, looking at the screen | স্থির হয়ে বসে ভাবুন, স্ক্রিনের দিকে তাকিয়ে |
| 23 | Calibrate | Get ready: {what} ({s}) | তৈরি হোন: {what} ({s}) |
| 24 | Calibrate | Your face was not found often enough. Raise or tilt the camera so it sees your face, then try again. | আপনার মুখ যথেষ্ট বার দেখা যায়নি। ক্যামেরা উঁচু করুন বা কাত করুন যাতে মুখ দেখা যায়, তারপর আবার চেষ্টা করুন। |
| 25 | Calibrate | Saved “{name}” | “{name}” সংরক্ষিত হয়েছে |
| 26 | Calibrate | Calibration cancelled. Nothing was changed. | Calibration বাতিল হয়েছে। কিছুই বদলায়নি। |
| 27 | Calibrate | Workstation and calibration | পড়ার জায়গা ও Calibration |
| 28 | Calibrate | What is this? | এটা কী? |
| 29 | Calibrate | Calibration (30 s): | Calibration (৩০ সেকেন্ড): |
| 30 | Calibrate | A soft beep tells you to switch after writing and after reading, and two tones play when it is over (at your alarm volume; none if it is 0). | লেখার পরে আর পড়ার পরে একটি নরম বিপ বলে দেবে পরের কাজে যেতে, আর শেষ হলে দুটি সুর বাজবে (অ্যালার্মের ভলিউমে; ভলিউম ০ হলে কোনো শব্দ নেই)। |
| 31 | Calibrate | 10 s writing, 10 s reading, 10 s thinking. Desk Watch learns how you look doing each, and your reading angle, so reading is not mistaken for looking down. Have a notebook and a book ready. | ১০ সেকেন্ড লেখা, ১০ সেকেন্ড পড়া, ১০ সেকেন্ড ভাবা। Desk Watch শিখে নেয় প্রতিটি করার সময় আপনাকে কেমন দেখায়, আর পড়ার সময় মাথা কতটা নিচু থাকে, যাতে পড়াকে নিচে তাকানো ভেবে ভুল না হয়। একটা খাতা আর একটা বই হাতের কাছে রাখুন। |
| 32 | Calibrate | Workstation: | পড়ার জায়গা: |
| 33 | Calibrate | a saved calibration for one place you study. Pick it before a session; no need to calibrate again. | যেখানে আপনি পড়েন সেই জায়গার সংরক্ষিত Calibration। Session-এর আগে এটা বেছে নিন; আবার calibrate করার দরকার নেই। |
| 34 | Calibrate | When to calibrate again: | কখন আবার calibrate করবেন: |
| 35 | Calibrate | New place: | নতুন জায়গা: |
| 36 | Calibrate | choose “+ New place…”, type its name and calibrate; it is saved when the 30 s are done. | “+ নতুন জায়গা…” বেছে নিন, নাম লিখুন আর calibrate করুন; ৩০ সেকেন্ড শেষ হলে সংরক্ষিত হবে। |
| 37 | Calibrate | Calibrate again | আবার calibrate করুন |
| 38 | Calibrate | updates the place that is selected. | বেছে নেওয়া জায়গাটি হালনাগাদ করে। |
| 39 | Calibrate | Calibrating… | Calibrate হচ্ছে… |
| 40 | Calibrate | Start calibration | Calibration শুরু করুন |
| 41 | Calibrate, Focus, Routines, Study | Cancel | বাতিল |
| 42 | Calibrate | Reading angle {angle} · activities {done} | পড়ার কোণ {angle} · কাজের ধরন {done} |
| 43 | Calibrate | Not calibrated yet: calibrate once before your first session. | এখনো calibrate করা হয়নি: প্রথম Session-এর আগে একবার calibrate করুন। |
| 44 | Calibrate | New place | নতুন জায়গা |
| 45 | Calibrate | Name, e.g. Library | নাম, যেমন লাইব্রেরি |
| 46 | Calibrate | Calibrate and save (30 s) | Calibrate করে সংরক্ষণ করুন (৩০ সেকেন্ড) |
| 47 | Calibrate | You already have a place with this name. Pick another name. | এই নামে আপনার একটি জায়গা আগে থেকেই আছে। অন্য নাম দিন। |
| 48 | Calibrate | A place with this name exists; it will be replaced. | এই নামে একটি জায়গা আছে; সেটি বদলে যাবে। |
| 49 | Calibrate | Sit at the new place the way you normally study, with a notebook and a book ready. | নতুন জায়গায় যেভাবে সাধারণত পড়েন সেভাবে বসুন, খাতা আর বই হাতের কাছে রেখে। |
| 50 | DayPlan | Previous day | আগের দিন |
| 51 | DayPlan, Planner | Day | দিন |
| 52 | DayPlan | Next day | পরের দিন |
| 53 | DayPlan, History, Todo, todo | Today | আজ |
| 54 | DayPlan | Today, {date} | আজ, {date} |
| 55 | DayPlan | Scheduled | পরিকল্পিত |
| 56 | DayPlan | Nothing scheduled: no weekly block on this weekday and no task with a time. | কিছু পরিকল্পিত নেই: এই বারে কোনো সাপ্তাহিক ব্লক নেই, সময়সহ কোনো কাজও নেই। |
| 57 | DayPlan, Focus, Planner, Tour | Done | সম্পন্ন |
| 58 | DayPlan | No sessions on this day. | এই দিনে কোনো Session নেই। |
| 59 | DayPlan | {title}, {sub}. Show the report | {title}, {sub}। রিপোর্ট দেখুন |
| 60 | DayPlan | Close the report | রিপোর্ট বন্ধ করুন |
| 61 | FirstRun | Welcome to Desk Watch | Desk Watch-এ স্বাগতম |
| 62 | FirstRun | Your camera | আপনার ক্যামেরা |
| 63 | FirstRun | Aim the camera | ক্যামেরা ঠিক দিকে রাখুন |
| 64 | FirstRun | Calibrate your place | আপনার জায়গা calibrate করুন |
| 65 | FirstRun | Connect your browser | আপনার ব্রাউজার যুক্ত করুন |
| 66 | FirstRun | Practice session | অনুশীলনের Session |
| 67 | FirstRun | Step {k} of {all} | ধাপ {k} / {all} |
| 68 | FirstRun, Settings | Language | ভাষা |
| 69 | FirstRun | Desk Watch watches your study sessions through the camera and rings an alarm when you pick up your phone, leave or look away. | Desk Watch ক্যামেরা দিয়ে আপনার পড়ার Session দেখে, আর আপনি ফোন তুললে, উঠে গেলে বা অন্য দিকে তাকালে অ্যালার্ম বাজায়। |
| 70 | FirstRun | 30 seconds: 10 writing, 10 reading, 10 thinking. Have a notebook and a book ready. Give this place a name. | ৩০ সেকেন্ড: ১০ লেখা, ১০ পড়া, ১০ ভাবা। খাতা আর বই হাতের কাছে রাখুন। এই জায়গার একটা নাম দিন। |
| 71 | FirstRun | Skip this step | এই ধাপ বাদ দিন |
| 72 | FirstRun, Tour | Next | পরের |
| 73 | FirstRun, History, Tour | Back | পেছনে |
| 74 | FirstRun | Skip setup | সেটআপ বাদ দিন |
| 75 | FirstRun, Study | Try again | আবার চেষ্টা করুন |
| 76 | FirstRun | The camera is on. | ক্যামেরা চালু আছে। |
| 77 | FirstRun, Study | Starting the camera… | ক্যামেরা চালু হচ্ছে… |
| 78 | FirstRun | Sit as you study, both hands on the desk. The picture should show your face at the top and the desk below. | যেভাবে পড়েন সেভাবে বসুন, দুই হাত টেবিলে। ছবির ওপরের দিকে আপনার মুখ আর নিচে টেবিল দেখা যাওয়া উচিত। |
| 79 | FirstRun | OK | ঠিক আছে |
| 80 | FirstRun | Optional. Lets Blocker mode block sites in Chrome or Edge. You can do this later in Settings → Advanced. | ইচ্ছামতো। এতে Blocker mode Chrome বা Edge-এ সাইট বন্ধ করতে পারে। পরে সেটিংস → উন্নত-এও করতে পারবেন। |
| 81 | FirstRun | Click Open extension folder. | “এক্সটেনশনের ফোল্ডার খুলুন”-এ ক্লিক করুন। |
| 82 | FirstRun | In Chrome open chrome://extensions (Edge: edge://extensions), switch on Developer mode, click Load unpacked and choose that folder. | Chrome-এ chrome://extensions খুলুন (Edge: edge://extensions), Developer mode চালু করুন, Load unpacked-এ ক্লিক করে ওই ফোল্ডারটি বেছে নিন। |
| 83 | FirstRun | Desk Watch asks “Connect Chrome?”: click Allow. | Desk Watch জিজ্ঞেস করবে “Chrome যুক্ত করবেন?”: অনুমতি দিন-এ ক্লিক করুন। |
| 84 | FirstRun, ScreenMode | Open extension folder | এক্সটেনশনের ফোল্ডার খুলুন |
| 85 | FirstRun, ScreenMode | Connected | যুক্ত |
| 86 | FirstRun, ScreenMode | Not connected yet | এখনো যুক্ত হয়নি |
| 87 | FirstRun | Two minutes with the camera on, so you see how a session works. It is never saved: it does not count in History or your streak. | ক্যামেরা চালু রেখে দুই মিনিট, যাতে দেখতে পান Session কীভাবে চলে। এটি কখনো সংরক্ষিত হয় না: ইতিহাসে বা ধারাবাহিকতায় গোনা হয় না। |
| 88 | FirstRun | Keep your phone near you. After 30 seconds you will be asked to pick it up. | ফোনটা কাছে রাখুন। ৩০ সেকেন্ড পরে সেটা তুলতে বলা হবে। |
| 89 | FirstRun | Start practice | অনুশীলন শুরু করুন |
| 90 | FirstRun | Skip practice | অনুশীলন বাদ দিন |
| 91 | FirstRun | This report is not saved. | এই রিপোর্ট সংরক্ষিত হয়নি। |
| 92 | FirstRun | Finish | শেষ করুন |
| 93 | FirstRun | Check the aim | ক্যামেরার দিক দেখুন |
| 94 | FirstRun | Practice: the alarm stops when you are back to studying. | অনুশীলন: আবার পড়ায় ফিরলে অ্যালার্ম থেমে যাবে। |
| 95 | FirstRun | End practice | অনুশীলন শেষ করুন |
| 96 | FirstRun, Focus, Study | Starting | শুরু হচ্ছে |
| 97 | Focus, Study, accounting | Paused | থামানো |
| 98 | Focus, accounting | Break is over | Break শেষ |
| 99 | Focus | Long break | Long break |
| 100 | Focus, Study, accounting | Break | Break |
| 101 | Focus, Todo | Time | সময় |
| 102 | Focus, Mini, Study | Pause | থামান |
| 103 | Focus | Stop | শেষ করুন |
| 104 | Focus, Study | Checking the camera… {left} | ক্যামেরা দেখা হচ্ছে… {left} |
| 105 | Focus, Study | The camera can’t see your face | ক্যামেরা আপনার মুখ দেখতে পাচ্ছে না |
| 106 | Focus, Study | Start anyway counts you as away, with the clock stopped, until the camera sees your face. | “তবুও শুরু করুন” দিলে ক্যামেরা আপনার মুখ না দেখা পর্যন্ত আপনাকে অনুপস্থিত ধরা হবে, ঘড়ি থেমে থাকবে। |
| 107 | Focus, Study | Fix it | ঠিক করুন |
| 108 | Focus, Study | Start anyway | তবুও শুরু করুন |
| 109 | Focus, Study | Focused time | মনোযোগের সময় |
| 110 | Focus | Time left | বাকি সময় |
| 111 | Focus | Stops at {min} min | {min} মিনিটে থামবে |
| 112 | Focus, Mini, Study | Resume | আবার চালু করুন |
| 113 | Focus, Study | Break time left | Break-এর বাকি সময় |
| 114 | Focus | Ready when you are. | আপনি তৈরি হলেই শুরু। |
| 115 | Focus | The next pomodoro starts by itself. | পরের Pomodoro নিজে থেকেই শুরু হবে। |
| 116 | Focus, Study | No alarms during your break. | Break-এর সময় কোনো অ্যালার্ম নেই। |
| 117 | Focus, Mini | Start next pomodoro | পরের Pomodoro শুরু করুন |
| 118 | Focus | Session ended | Session শেষ |
| 119 | Focus | focused on {task} | {task}-এ মনোযোগ |
| 120 | Focus | focused | মনোযোগ |
| 121 | Focus, Study, Todo | Close | বন্ধ করুন |
| 122 | Focus | Start again | আবার শুরু করুন |
| 123 | Focus, Study | Focus mode | Focus mode |
| 124 | Focus | Keep holding Esc to leave… | বের হতে Esc চেপে ধরে রাখুন… |
| 125 | Focus | Exit | বের হন |
| 126 | Focus | Focus mode options | Focus mode-এর বিকল্প |
| 127 | Focus | Timer | টাইমার |
| 128 | Focus | Sound | শব্দ |
| 129 | Focus | Background | পটভূমি |
| 130 | Focus | Today's tasks | আজকের কাজ |
| 131 | Focus | Volume | ভলিউম |
| 132 | Focus | Made on this computer; no sound files. | এই কম্পিউটারেই তৈরি; কোনো শব্দ-ফাইল নেই। |
| 133 | Focus | End the session? | Session শেষ করবেন? |
| 134 | Focus | It is saved as ending now. Or keep going in a small timer on top of your other windows. | এখনই শেষ হয়েছে বলে সংরক্ষিত হবে। অথবা অন্য উইন্ডোর ওপরে একটি ছোট টাইমারে চালিয়ে যান। |
| 135 | Focus, Study | Strict mode is on. To end early, type this sentence exactly: | Strict mode চালু আছে। আগে শেষ করতে এই বাক্যটি হুবহু লিখুন: |
| 136 | Focus, Study | Sentence | বাক্য |
| 137 | Focus | Keep going in a small window | ছোট উইন্ডোতে চালিয়ে যান |
| 138 | Focus, Study | End session | Session শেষ করুন |
| 139 | Focus | Timer mode | টাইমারের ধরন |
| 140 | Focus | Pomodoro (min) | Pomodoro (মিনিট) |
| 141 | Focus | Break (min) | Break (মিনিট) |
| 142 | Focus | Long break (min) | Long break (মিনিট) |
| 143 | Focus | Long break after | Long break কয়টির পরে |
| 144 | Focus, Settings | Number of pomodoros | Pomodoro-র সংখ্যা |
| 145 | Settings | in a Focus mode run | Focus mode-এর এক দফায় |
| 146 | Focus | Set your timer | টাইমার ঠিক করুন |
| 147 | Focus | {done} of {count} pomodoros done | {count}টির মধ্যে {done}টি Pomodoro শেষ |
| 148 | Focus | Length (min) | দৈর্ঘ্য (মিনিট) |
| 149 | Focus | Stops at (min) | থামবে (মিনিট) |
| 150 | Focus | Start the next pomodoro after a break by itself | Break-এর পরে পরের Pomodoro নিজে থেকে শুরু হোক |
| 151 | Focus | Changes apply from the next start. | পরিবর্তন পরের শুরু থেকে কার্যকর হবে। |
| 152 | Focus | Nothing due today. | আজ কোনো কাজ জমা দেওয়ার নেই। |
| 153 | Focus, Todo | Complete {title} | {title} সম্পন্ন করুন |
| 154 | Focus | Now | এখন |
| 155 | Focus | Switch | বদলান |
| 156 | Focus, History, Study | No task | কোনো কাজ নেই |
| 157 | History, Routines, todo | This week | এই সপ্তাহ |
| 158 | History | 7 days | ৭ দিন |
| 159 | History | 30 days | ৩০ দিন |
| 160 | History, Report, Routines | Loading… | লোড হচ্ছে… |
| 161 | History | No sessions yet | এখনো কোনো Session নেই |
| 162 | History | Your first session will show up here. | আপনার প্রথম Session এখানে দেখা যাবে। |
| 163 | History | Go to Study | পড়ার পাতায় যান |
| 164 | History | Period | সময়কাল |
| 165 | History | Focused minutes per day, last {days} days | প্রতিদিনের মনোযোগী মিনিট, শেষ {days} দিন |
| 166 | History | {date}: {m} focused minutes, {p} pomodoros | {date}: {m} মনোযোগী মিনিট, {p}টি Pomodoro |
| 167 | History | {m} focused min · {p} pomodoros | {m} মনোযোগী মিনিট · {p}টি Pomodoro |
| 168 | History | The number above a day is its pomodoros. | দিনের উপরের সংখ্যাটি সেদিনের Pomodoro। |
| 169 | History | All time | সব সময় |
| 170 | History | By task | কাজ অনুযায়ী |
| 171 | History | By subject | বিষয় অনুযায়ী |
| 172 | History | Stats | পরিসংখ্যান |
| 173 | History | Pomodoros | Pomodoro |
| 174 | History, Planner | No subject | কোনো বিষয় নেই |
| 175 | Planner | All subjects | সব বিষয় |
| 176 | Planner | Delete “{title}”? | “{title}” মুছে ফেলবেন? |
| 177 | Report | Task: {title} | কাজ: {title} |
| 178 | History | Click a day to see its sessions. | কোনো দিনে ক্লিক করলে সেই দিনের Session দেখবেন। |
| 179 | History | No sessions this week yet (the week started on {date}). | এই সপ্তাহে এখনো কোনো Session নেই (সপ্তাহ শুরু হয়েছে {date})। |
| 180 | History | Best day | সেরা দিন |
| 181 | History | {day}, {time} focused. | {day}, {time} মনোযোগ। |
| 182 | History | No focused time yet. | এখনো মনোযোগের সময় নেই। |
| 183 | History | Top distraction | সবচেয়ে বেশি মনোযোগ নষ্ট |
| 184 | History | None this week. | এই সপ্তাহে নেই। |
| 185 | History | Phone pickups | ফোন তোলা |
| 186 | History | The week started on {date}. | সপ্তাহ শুরু হয়েছে {date}। |
| 187 | History | Day streak: {n} day. | টানা দিন: {n} দিন। |
| 188 | History | Day streak: {n} days. | টানা দিন: {n} দিন। |
| 189 | History | {name}, {n} time. | {name}, {n} বার। |
| 190 | History | {name}, {n} times. | {name}, {n} বার। |
| 191 | Mini | Drag to move | সরাতে টেনে নিন |
| 192 | Mini | Back to full screen | পুরো স্ক্রিনে ফিরুন |
| 193 | Planner | To do | করতে হবে |
| 194 | Planner | Doing | চলছে |
| 195 | Planner | List | তালিকা |
| 196 | Planner | Board | Board |
| 197 | Planner | Week | সপ্তাহ |
| 198 | Planner | View | দেখার ধরন |
| 199 | Planner, Todo | No tasks yet | এখনো কোনো কাজ নেই |
| 200 | Planner | Type a task above and press Enter. Drag it from To do to Doing to Done. | ওপরে একটি কাজ লিখে Enter চাপুন। সেটিকে “করতে হবে” থেকে “চলছে” হয়ে “সম্পন্ন”-এ টেনে নিন। |
| 201 | Planner | Move {title} left | {title} বাঁয়ে সরান |
| 202 | Planner | Move {title} right | {title} ডানে সরান |
| 203 | Routines | Start time | শুরুর সময় |
| 204 | History, Study | Task | কাজ |
| 205 | Routines, Study, setup | Camera mode | Camera mode |
| 206 | Routines, Study, setup | Blocker mode | Blocker mode |
| 207 | Routines | Block set | ব্লক সেট |
| 208 | Routines | Set chosen on the Study tab | পড়ার পাতায় বেছে নেওয়া সেট |
| 209 | Routines | Get this block ready on the Study tab | এই ব্লকটি পড়ার পাতায় তৈরি করে রাখুন |
| 210 | Routines, Settings | Camera | ক্যামেরা |
| 211 | Routines | Screen | স্ক্রিন |
| 212 | Routines | Timer only | শুধু টাইমার |
| 213 | Planner | Study block at {time}: {task} ({min} min) | {time}-এ পড়ার ব্লক: {task} ({min} মিনিট) |
| 214 | Planner, main | study | পড়া |
| 215 | Planner | Get it ready | তৈরি করুন |
| 216 | Planner, Study | Dismiss | সরিয়ে দিন |
| 217 | Report | Focused · {pct}% of {total} | মনোযোগ · {total}-এর {pct}% |
| 218 | Report | Longest focus streak | সবচেয়ে লম্বা টানা মনোযোগ |
| 219 | Report, accounting | Studying | পড়া চলছে |
| 220 | Report | Distracted | মনোযোগ নষ্ট |
| 221 | Report | Break / Pause | Break / থামানো |
| 222 | Report | Point at a block, or press Tab, to see what it was. | কোনো অংশ কী ছিল দেখতে তার ওপর মাউস রাখুন বা Tab চাপুন। |
| 223 | Report | Show details | বিস্তারিত দেখুন |
| 224 | Report | Session report | Session-এর রিপোর্ট |
| 225 | Report | ended early | আগেই শেষ |
| 226 | Report | goal reached | লক্ষ্য পূরণ |
| 227 | Report | No sessions this day. | এই দিনে কোনো Session নেই। |
| 228 | Report | {time} focused of {min} min | {min} মিনিটের মধ্যে {time} মনোযোগ |
| 229 | Report | Distraction | মনোযোগ নষ্ট |
| 230 | History, Report | Distractions | মনোযোগ নষ্ট |
| 231 | Report | {n} session | {n}টি Session |
| 232 | Report | {n} sessions | {n}টি Session |
| 233 | ScreenMode | Blocker mode cannot start its local connection: {error} | Blocker mode তার স্থানীয় সংযোগ চালু করতে পারছে না: {error} |
| 234 | ScreenMode | Browser extension connected | ব্রাউজার এক্সটেনশন যুক্ত |
| 235 | ScreenMode | Browser extension not connected: sites cannot be blocked (apps still can). | ব্রাউজার এক্সটেনশন যুক্ত নেই: সাইট বন্ধ করা যাবে না (অ্যাপ এখনো যাবে)। |
| 236 | ScreenMode | Set it up | চালু করুন |
| 237 | ScreenMode | Blocked sites | বন্ধ করা সাইট |
| 238 | ScreenMode | Productive sites (never blocked) | কাজের সাইট (কখনো বন্ধ হয় না) |
| 239 | ScreenMode | Blocked apps | বন্ধ করা অ্যাপ |
| 240 | ScreenMode | “{typed}” does not look like a web address or a program name. | “{typed}” কোনো ওয়েব ঠিকানা বা প্রোগ্রামের নাম বলে মনে হচ্ছে না। |
| 241 | ScreenMode | Apps can only be blocked, not marked productive. | অ্যাপ শুধু বন্ধ করা যায়, কাজের বলে চিহ্নিত করা যায় না। |
| 242 | ScreenMode | {site} is on your productive list. You can move it after the session. | {site} আপনার কাজের তালিকায় আছে। Session-এর পরে সরাতে পারবেন। |
| 243 | ScreenMode | Block sets | ব্লক সেট |
| 244 | ScreenMode | Edit sets | সেট বদলান |
| 245 | ScreenMode | Set name | সেটের নাম |
| 246 | ScreenMode | New set (copy of {name}) | নতুন সেট ({name}-এর কপি) |
| 247 | ScreenMode, Todo | Rename {name} | {name}-এর নাম বদলান |
| 248 | ScreenMode | Delete the set “{name}”? | “{name}” সেটটি মুছবেন? |
| 249 | ScreenMode, Todo | Delete {name} | {name} মুছুন |
| 250 | ScreenMode | Locked until the session ends: you can only add blocked sites and apps. | Session শেষ না হওয়া পর্যন্ত বন্ধ: শুধু বন্ধ করার সাইট ও অ্যাপ যোগ করতে পারবেন। |
| 251 | ScreenMode | Quick add | দ্রুত যোগ |
| 252 | ScreenMode | Remove | সরান |
| 253 | ScreenMode | Remove {name} | {name} সরান |
| 254 | ScreenMode | Add site or app, e.g. youtube.com/shorts or Discord | সাইট বা অ্যাপ যোগ করুন, যেমন youtube.com/shorts বা Discord |
| 255 | ScreenMode | Add to | যোগ করুন |
| 256 | ScreenMode | Block | বন্ধ করুন |
| 257 | ScreenMode | Always allow | সবসময় অনুমতি |
| 258 | ScreenMode | Add | যোগ করুন |
| 259 | ScreenMode | Browser extension | ব্রাউজার এক্সটেনশন |
| 260 | ScreenMode | How to install | কীভাবে ইনস্টল করবেন |
| 261 | ScreenMode | The extension lets Desk Watch see which site is open in Chrome or Edge, and send blocked sites to a “Back to work” page. It only talks to this computer. Firefox is not supported. | এক্সটেনশনটি দিয়ে Desk Watch দেখতে পায় Chrome বা Edge-এ কোন সাইট খোলা, আর বন্ধ করা সাইটকে “কাজে ফিরুন” পাতায় পাঠায়। এটি শুধু এই কম্পিউটারের সঙ্গে কথা বলে। Firefox চলে না। |
| 262 | ScreenMode | Install (once): | ইনস্টল (একবার): |
| 263 | ScreenMode | 1. Click Open extension folder. 2. In Chrome open chrome://extensions (Edge: edge://extensions), switch on Developer mode, click Load unpacked and choose that folder. 3. Desk Watch asks “Connect Chrome?”: click Allow. Done. | ১. “এক্সটেনশনের ফোল্ডার খুলুন”-এ ক্লিক করুন। ২. Chrome-এ chrome://extensions খুলুন (Edge: edge://extensions), Developer mode চালু করুন, Load unpacked-এ ক্লিক করে ওই ফোল্ডারটি বেছে নিন। ৩. Desk Watch জিজ্ঞেস করবে “Chrome যুক্ত করবেন?”: অনুমতি দিন-এ ক্লিক করুন। হয়ে গেল। |
| 264 | ScreenMode | Pairing code | জোড়ার কোড |
| 265 | ScreenMode | (only if the Allow question does not appear): type it in the extension’s options. | (শুধু যদি অনুমতির প্রশ্নটি না আসে): এক্সটেনশনের options-এ এটি লিখুন। |
| 266 | ScreenMode | For private windows, also switch on Allow in incognito in the extension’s details. | প্রাইভেট উইন্ডোর জন্য এক্সটেনশনের details-এ Allow in incognito-ও চালু করুন। |
| 267 | ScreenMode | Disconnect | বিচ্ছিন্ন করুন |
| 268 | ScreenMode | Pairing code (fallback): | জোড়ার কোড (বিকল্প): |
| 269 | ScreenMode | New code | নতুন কোড |
| 270 | ScreenMode | Block lists and sets are on the Study tab: tick Blocker mode. | ব্লক তালিকা ও সেট পড়ার পাতায় আছে: Blocker mode-এ টিক দিন। |
| 271 | ScreenMode | On the computer | কম্পিউটারে |
| 272 | ScreenMode | Connect {name}? | {name} যুক্ত করবেন? |
| 273 | ScreenMode | The Desk Watch blocker extension in {name} wants to connect, so Blocker mode can block sites there. | {name}-এর Desk Watch ব্লকার এক্সটেনশন যুক্ত হতে চায়, যাতে Blocker mode সেখানে সাইট বন্ধ করতে পারে। |
| 274 | ScreenMode | Only allow it if you just installed the extension yourself. | শুধু তখনই অনুমতি দিন যদি আপনি নিজেই এইমাত্র এক্সটেনশনটি ইনস্টল করে থাকেন। |
| 275 | ScreenMode | Allow | অনুমতি দিন |
| 276 | ScreenMode | Don’t allow | অনুমতি দেবেন না |
| 277 | ScreenMode | {n} blocked attempt | {n}বার বন্ধ করা হয়েছে |
| 278 | ScreenMode | {n} blocked attempts | {n}বার বন্ধ করা হয়েছে |
| 279 | Settings | Phone: evidence needed to count as phone (0-1) | ফোন: ফোন ধরার জন্য প্রয়োজনীয় প্রমাণ (০-১) |
| 280 | Settings | Phone: evidence below this counts as phone gone (0-1) | ফোন: এর নিচে প্রমাণ মানে ফোন সরানো হয়েছে (০-১) |
| 281 | Settings | Phone: seconds before the Phone alarm | ফোন: ফোন-অ্যালার্মের আগে কত সেকেন্ড |
| 282 | Settings | Phone: short dips forgiven (seconds) | ফোন: ছোট বিরতি উপেক্ষা (সেকেন্ড) |
| 283 | Settings | Phone: seconds without phone to clear it | ফোন: ফোন ছাড়া কত সেকেন্ড পরে মুছবে |
| 284 | Settings | Phone: also use the zoomed hand view (catches more phones) | ফোন: হাতের বড় করা ছবিও ব্যবহার করুন (বেশি ফোন ধরে) |
| 285 | Settings | Phone: ignore objects that look like a calculator, pen or book | ফোন: ক্যালকুলেটর, কলম বা বইয়ের মতো জিনিস উপেক্ষা করুন |
| 286 | Settings | Phone: confidence needed to name an object (0-1) | ফোন: কোনো জিনিস চিনতে প্রয়োজনীয় নিশ্চয়তা (০-১) |
| 287 | Settings | Phone: ignore phone boxes in a hand the object model is this sure is empty (0 = off) | ফোন: জিনিস-চেনার মডেল যে হাতকে এতটা নিশ্চিতভাবে খালি বলে, সেখানে ফোনের ঘর উপেক্ষা করুন (০ = বন্ধ) |
| 288 | Settings | Phone: a raised, still hand adds evidence | ফোন: ওপরে তোলা স্থির হাত প্রমাণ বাড়ায় |
| 289 | Settings | Phone: hand view size (× hand size) | ফোন: হাতের ছবির মাপ (× হাতের মাপ) |
| 290 | Settings | Raised hand: minimum phone evidence | তোলা হাত: সবচেয়ে কম ফোনের প্রমাণ |
| 291 | Settings | Raised hand: seconds held still | তোলা হাত: কত সেকেন্ড স্থির |
| 292 | Settings | Raised hand: "still" means moving less than (share of width) | তোলা হাত: "স্থির" মানে এর চেয়ে কম নড়া (চওড়ার অংশ) |
| 293 | Settings | Phone call: seconds before the alarm | ফোন কল: অ্যালার্মের আগে কত সেকেন্ড |
| 294 | Settings | Phone call: seconds to clear it | ফোন কল: কত সেকেন্ড পরে মুছবে |
| 295 | Settings | Phone call: finger distance to ear (face widths) | ফোন কল: আঙুল থেকে কানের দূরত্ব (মুখের চওড়ায়) |
| 296 | Settings | Phone call: phone distance to ear (face widths) | ফোন কল: ফোন থেকে কানের দূরত্ব (মুখের চওড়ায়) |
| 297 | Settings | Phone call: hand must be this far out past the ear (face widths) | ফোন কল: হাত কানের এতটা বাইরে থাকতে হবে (মুখের চওড়ায়) |
| 298 | Settings | Phone call: phone evidence needed at the hand (0 = hand at ear is enough) | ফোন কল: হাতে প্রয়োজনীয় ফোনের প্রমাণ (০ = কানে হাতই যথেষ্ট) |
| 299 | Settings | Looking down: seconds before the alarm | নিচে তাকানো: অ্যালার্মের আগে কত সেকেন্ড |
| 300 | Settings | Looking down: degrees beyond your reading angle | নিচে তাকানো: আপনার পড়ার কোণের চেয়ে কত ডিগ্রি বেশি |
| 301 | Settings | Looking down: angle used until you calibrate (degrees) | নিচে তাকানো: calibrate না করা পর্যন্ত ব্যবহৃত কোণ (ডিগ্রি) |
| 302 | Settings | Away: seconds before the alarm | অনুপস্থিত: অ্যালার্মের আগে কত সেকেন্ড |
| 303 | Settings | Looking away: seconds before the alarm | অন্য দিকে তাকানো: অ্যালার্মের আগে কত সেকেন্ড |
| 304 | Settings | Looking away: eyes sideways (0-1) | অন্য দিকে তাকানো: চোখ পাশে (০-১) |
| 305 | Settings | Looking away: or head turned more than (degrees) | অন্য দিকে তাকানো: অথবা মাথা এর বেশি ঘোরানো (ডিগ্রি) |
| 306 | Settings | Speaking: mouth movement (0-1) | কথা বলা: মুখের নড়াচড়া (০-১) |
| 307 | Settings | Reading (before calibration): eyes down (0-1) | পড়া (Calibration-এর আগে): চোখ নিচে (০-১) |
| 308 | Settings | Writing (before calibration): visible hand movement | লেখা (Calibration-এর আগে): হাতের দেখা যাওয়া নড়াচড়া |
| 309 | Settings | Phone in lap: eyes-level rule (0 = off; try 0.15) | কোলে ফোন: চোখ-সমতলের নিয়ম (০ = বন্ধ; ০.১৫ চেষ্টা করুন) |
| 310 | Settings | Phone in lap: degrees past your reading angle (can be negative) | কোলে ফোন: পড়ার কোণের চেয়ে কত ডিগ্রি বেশি (ঋণাত্মক হতে পারে) |
| 311 | Settings | Person: confidence needed to count you as present (0-1) | মানুষ: আপনাকে উপস্থিত ধরতে প্রয়োজনীয় নিশ্চয়তা (০-১) |
| 312 | Settings | Smoothing window (milliseconds) | মসৃণ করার সময় (মিলিসেকেন্ড) |
| 313 | Settings | Checks per second | প্রতি সেকেন্ডে কতবার দেখা |
| 314 | Settings | Same as Windows | Windows-এর মতো |
| 315 | Settings | Light | Light |
| 316 | Settings | Dark | Dark |
| 317 | Settings | Auto | স্বয়ংক্রিয় |
| 318 | Settings, power | Full | পূর্ণ |
| 319 | Settings | Low power | কম শক্তি |
| 320 | Settings | Default camera | ডিফল্ট ক্যামেরা |
| 321 | Settings | Saved to {path} | {path}-এ সংরক্ষিত |
| 322 | Settings | Importing REPLACES all your sessions and settings with the ones in the file.<br><br>Export your current data first if you may want it back. Continue? | আমদানি করলে আপনার সব Session ও সেটিংস ফাইলের গুলো দিয়ে বদলে যাবে।<br><br>পরে ফেরত চাইতে পারেন মনে হলে আগে বর্তমান ডেটা রপ্তানি করুন। চালিয়ে যাবেন? |
| 323 | Settings | Imported. | আমদানি হয়েছে। |
| 324 | Settings | Delete ALL your sessions, history and settings? This cannot be undone. | আপনার সব Session, ইতিহাস ও সেটিংস মুছবেন? এটি আর ফেরানো যাবে না। |
| 325 | Settings | Are you sure? Everything in the database will be gone. | আপনি কি নিশ্চিত? ডেটাবেসের সবকিছু চলে যাবে। |
| 326 | Settings | All data deleted. | সব ডেটা মোছা হয়েছে। |
| 327 | History, Settings, setup | Sessions | Session |
| 328 | Settings | Default length (focused minutes) | স্বাভাবিক দৈর্ঘ্য (মনোযোগী মিনিট) |
| 329 | Settings | Break length (minutes) | Break-এর দৈর্ঘ্য (মিনিট) |
| 330 | Settings | Strict mode | Strict mode |
| 331 | Settings | ending a session early needs a typed sentence | আগে Session শেষ করতে একটি বাক্য লিখতে হয় |
| 332 | Settings | Routine reminders | রুটিনের রিমাইন্ডার |
| 333 | Settings | when a block from your weekly plan starts (not during a session) | আপনার সাপ্তাহিক পরিকল্পনার কোনো ব্লক শুরু হলে (Session চলার সময় নয়) |
| 334 | Settings, focus | Pomodoro | Pomodoro |
| 335 | Settings | Used by Focus mode and the to-do list: a pomodoro is this many minutes of camera-checked focused time. | Focus mode ও কাজের তালিকায় ব্যবহৃত: ক্যামেরায় যাচাই করা এত মিনিট মনোযোগী সময় মানে একটি Pomodoro। |
| 336 | Settings | Pomodoro length (minutes) | Pomodoro-র দৈর্ঘ্য (মিনিট) |
| 337 | Settings | Break (minutes) | Break (মিনিট) |
| 338 | Settings | Long break (minutes) | Long break (মিনিট) |
| 339 | Settings | Long break after (pomodoros) | Long break কয়টির পরে (Pomodoro) |
| 340 | Settings | Daily goal (pomodoros) | দৈনিক লক্ষ্য (Pomodoro) |
| 341 | Settings | Start the next pomodoro by itself | পরের Pomodoro নিজে থেকে শুরু হোক |
| 342 | Settings | when a break ends; otherwise press Start next pomodoro | Break শেষ হলে; নইলে “পরের Pomodoro শুরু করুন” চাপুন |
| 343 | Settings | Alarm | অ্যালার্ম |
| 344 | Settings | Alarm sound | অ্যালার্মের শব্দ |
| 345 | Settings | Chosen | বেছে নেওয়া |
| 346 | Settings | Click to hear | শুনতে ক্লিক করুন |
| 347 | Settings | Volume {pct}% | ভলিউম {pct}% |
| 348 | Settings | Test sound | শব্দ পরীক্ষা করুন |
| 349 | Settings | App | অ্যাপ |
| 350 | Settings | Bangla uses Bangla digits and dates. The Debug tab stays in English. | বাংলায় সংখ্যা ও তারিখ বাংলায় দেখায়। Debug ট্যাব ইংরেজিতেই থাকে। |
| 351 | Settings | Week starts on | সপ্তাহ শুরু হয় |
| 352 | Settings | Used by the Planner’s week and History’s “This week”. | পরিকল্পনার সপ্তাহ আর ইতিহাসের “এই সপ্তাহ”-এ ব্যবহৃত। |
| 353 | Settings | Theme | থিম |
| 354 | Settings | Start Desk Watch when I log in to Windows | Windows-এ লগইন করলে Desk Watch চালু হোক |
| 355 | Settings | Your data | আপনার ডেটা |
| 356 | Settings | Everything is stored only on this computer, in one file: | সবকিছু শুধু এই কম্পিউটারে একটি ফাইলে রাখা আছে: |
| 357 | Settings | , plus weekly backups of it. | , সঙ্গে এর সাপ্তাহিক ব্যাকআপ। |
| 358 | Settings | Open folder | ফোল্ডার খুলুন |
| 359 | Settings | Export sessions (CSV) | Session রপ্তানি করুন (CSV) |
| 360 | Settings | Export everything (JSON) | সব রপ্তানি করুন (JSON) |
| 361 | Settings | Import JSON… | JSON আমদানি করুন… |
| 362 | Settings | End your session to import, restore or delete data. | ডেটা আমদানি, পুনরুদ্ধার বা মুছতে Session শেষ করুন। |
| 363 | Settings, setup | Advanced | উন্নত |
| 364 | Settings | Show Debug tab | Debug ট্যাব দেখান |
| 365 | Settings | for recording test clips and checking detection | টেস্ট ক্লিপ রেকর্ড আর শনাক্তকরণ যাচাইয়ের জন্য |
| 366 | Settings | Performance | গতি |
| 367 | Settings | Auto measures your computer’s speed after start and uses a lighter mode only if it is too slow. On the test clips the smaller phone model was as good as the full one, and checking 2 times a second instead of 5 caught the same phones, with the alarm about 1 second later. | স্বয়ংক্রিয় মোড চালু হওয়ার পরে আপনার কম্পিউটারের গতি মাপে, আর খুব ধীর হলে তবেই হালকা মোড ব্যবহার করে। টেস্ট ক্লিপে ছোট ফোন-মডেলটি পূর্ণ মডেলের মতোই ভালো ছিল, আর সেকেন্ডে ৫ বারের বদলে ২ বার দেখলেও একই ফোন ধরা পড়েছে, অ্যালার্ম প্রায় ১ সেকেন্ড দেরিতে বেজেছে। |
| 368 | Settings | In use: {level} | চালু আছে: {level} |
| 369 | Settings | measured {phone} phone checks and {hands} hand checks a second | মাপা হয়েছে সেকেন্ডে {phone}বার ফোন ও {hands}বার হাত দেখা |
| 370 | Settings | ({min} needed) | ({min} দরকার) |
| 371 | Settings | measuring… | মাপা হচ্ছে… |
| 372 | Settings | Browser connection | ব্রাউজার সংযোগ |
| 373 | Settings | Workstations | পড়ার জায়গা |
| 374 | Settings | Detection thresholds | শনাক্তকরণের সীমা |
| 375 | Settings | The defaults were tuned on test clips. Change them only if detection is wrong for you. | স্বাভাবিক মানগুলো টেস্ট ক্লিপে ঠিক করা। শনাক্তকরণ আপনার জন্য ভুল হলে তবেই বদলান। |
| 376 | Settings | Reset thresholds to defaults | সীমাগুলো আগের মানে ফেরান |
| 377 | Settings | Delete all my data | আমার সব ডেটা মুছুন |
| 378 | Settings | Deletes every session, task, block list, setting and backup. Test clips from the Debug tab are kept in their own folder. | সব Session, কাজ, ব্লক তালিকা, সেটিংস ও ব্যাকআপ মুছে দেয়। Debug ট্যাবের টেস্ট ক্লিপ নিজেদের ফোল্ডারে থেকে যায়। |
| 379 | Settings | {kb} KB | {kb} কেবি |
| 380 | Settings | {mb} MB | {mb} এমবি |
| 381 | Settings | Backup made. | ব্যাকআপ তৈরি হয়েছে। |
| 382 | Settings | Restore the backup from {when}?<br><br>Your current data is backed up first, then replaced by this backup. Anything added after that backup will only be in the “before restore” backup. | {when}-এর ব্যাকআপ পুনরুদ্ধার করবেন?<br><br>আগে আপনার বর্তমান ডেটার ব্যাকআপ নেওয়া হবে, তারপর এই ব্যাকআপ দিয়ে বদলানো হবে। ওই ব্যাকআপের পরে যা যোগ হয়েছে তা শুধু “পুনরুদ্ধারের আগে” ব্যাকআপে থাকবে। |
| 383 | Settings | Backups | ব্যাকআপ |
| 384 | Settings | A copy of your data is saved once a week; the newest 4 are kept. | সপ্তাহে একবার আপনার ডেটার একটি কপি রাখা হয়; সবচেয়ে নতুন ৪টি থাকে। |
| 385 | Settings | Last backup: {when}. | শেষ ব্যাকআপ: {when}। |
| 386 | Settings | No backup yet. | এখনো কোনো ব্যাকআপ নেই। |
| 387 | Settings | Back up now | এখনই ব্যাকআপ নিন |
| 388 | Settings | Open backups folder | ব্যাকআপের ফোল্ডার খুলুন |
| 389 | Settings | before restore | পুনরুদ্ধারের আগে |
| 390 | Settings | Restore… | পুনরুদ্ধার… |
| 391 | Study | I am choosing to stop before my goal and I accept that. | আমি লক্ষ্যের আগেই থামছি এবং এটা মেনে নিচ্ছি। |
| 392 | Study | Close it and get back to work. | এটা বন্ধ করে কাজে ফিরুন। |
| 393 | Study, useSession | Time to get back to work. | এবার কাজে ফেরার সময়। |
| 394 | Study | Come back to your desk. | টেবিলে ফিরে আসুন। |
| 395 | Study | Put the phone down. | ফোন নামিয়ে রাখুন। |
| 396 | Study | Eyes back on your work. | চোখ আবার কাজে ফেরান। |
| 397 | Study | Saving… | সংরক্ষণ হচ্ছে… |
| 398 | Study | Goal reached | লক্ষ্য পূরণ হয়েছে |
| 399 | Study | Start a new session | নতুন Session শুরু করুন |
| 400 | Study | End now? You still have {time} to your goal. | এখনই শেষ করবেন? লক্ষ্যে পৌঁছাতে এখনো {time} বাকি। |
| 401 | Study | Or in English: | অথবা ইংরেজিতে: |
| 402 | Study | Keep studying | পড়া চালিয়ে যান |
| 403 | Focus, Study | Back to work | কাজে ফিরুন |
| 404 | Study | An estimate from the camera. Writing, reading, speaking and idle all count as study time. | ক্যামেরা থেকে আন্দাজ। লেখা, পড়া, কথা বলা ও চুপ করে বসে থাকা সবই পড়ার সময় হিসেবে গোনা হয়। |
| 405 | Study | estimate | আন্দাজ |
| 406 | Focus, Study | Progress to your goal | লক্ষ্যের দিকে অগ্রগতি |
| 407 | Study | {left} to go · goal {min} min | আর {left} · লক্ষ্য {min} মিনিট |
| 408 | Study | camera off | ক্যামেরা বন্ধ |
| 409 | Study | Browser extension not connected: sites can’t be blocked. | ব্রাউজার এক্সটেনশন যুক্ত নেই: সাইট বন্ধ করা যাবে না। |
| 410 | Study | Full screen | পুরো স্ক্রিন |
| 411 | Study | Break {min} min | {min} মিনিট Break |
| 412 | Study | For the washroom or something urgent: no time limit, no alarm | বাথরুম বা জরুরি কিছুর জন্য: সময়ের সীমা নেই, অ্যালার্ম নেই |
| 413 | Study | Block another site or app | আরেকটি সাইট বা অ্যাপ বন্ধ করুন |
| 414 | Study | Clock and alarms are stopped. | ঘড়ি ও অ্যালার্ম থেমে আছে। |
| 415 | Study | {place} calibrated | {place} calibrate করা |
| 416 | Study, Workstations | calibrated | Calibrate করা |
| 417 | Study | not calibrated yet | এখনো calibrate করা হয়নি |
| 418 | Study | Ready · timer only | তৈরি · শুধু টাইমার |
| 419 | Study | Ready | তৈরি |
| 420 | Study | camera sees you | ক্যামেরা আপনাকে দেখছে |
| 421 | Study | camera can’t see your face | ক্যামেরা আপনার মুখ দেখতে পাচ্ছে না |
| 422 | Study, setup | Session length | Session-এর দৈর্ঘ্য |
| 423 | Study | Length | দৈর্ঘ্য |
| 424 | Study | Custom | নিজের মতো |
| 425 | Study, todo | {m} min | {m} মিনিট |
| 426 | Study | Minutes | মিনিট |
| 427 | Study | On | চালু |
| 428 | Study, noise | Off | বন্ধ |
| 429 | Study | Alarm for phone, leaving or looking away | ফোন, উঠে যাওয়া বা অন্য দিকে তাকালে অ্যালার্ম |
| 430 | Study | Blocks the sites and apps on your list | আপনার তালিকার সাইট ও অ্যাপ বন্ধ রাখে |
| 431 | Focus, Study, Todo, setup | Start | শুরু করুন |
| 432 | Study | Full screen, with a pomodoro, countdown or count-up timer (Timer in Focus mode) | পুরো স্ক্রিনে, Pomodoro, Countdown বা Count-up টাইমারসহ (Focus mode-এর টাইমার) |
| 433 | Study, setup | More options | আরও বিকল্প |
| 434 | Study | Task: {task} | কাজ: {task} |
| 435 | Study | none | নেই |
| 436 | Study | Place and calibration | জায়গা ও Calibration |
| 437 | Study | Block lists | ব্লক তালিকা |
| 438 | Study | Hide camera | ক্যামেরা লুকান |
| 439 | Study | Show camera | ক্যামেরা দেখান |
| 440 | Study | No tasks yet. | এখনো কোনো কাজ নেই। |
| 441 | Study | Add one in the Planner | পরিকল্পনায় একটি যোগ করুন |
| 442 | Study | study block | পড়ার ব্লক |
| 443 | Study | Next: {time} {name} | পরের: {time} {name} |
| 444 | Study | No more blocks today | আজ আর কোনো ব্লক নেই |
| 445 | Study | Mark this task as done? | এই কাজটি সম্পন্ন বলে চিহ্নিত করবেন? |
| 446 | Study | Yes | হ্যাঁ |
| 447 | Study | Not yet | এখনো না |
| 448 | Study | {n} task due today | আজ {n}টি কাজ জমা |
| 449 | Study | {n} tasks due today | আজ {n}টি কাজ জমা |
| 450 | Todo | High | বেশি |
| 451 | Todo | Normal | সাধারণ |
| 452 | Todo | Low | কম |
| 453 | Todo | Does not repeat | ফিরে আসে না |
| 454 | Todo | Every day | প্রতিদিন |
| 455 | Todo | Every weekday (Mon–Fri) | প্রতি কর্মদিবস (সোম–শুক্র) |
| 456 | Todo | Every week | প্রতি সপ্তাহ |
| 457 | Todo | Done: {title}. | সম্পন্ন: {title}। |
| 458 | Todo | The next one is planned. | পরেরটি পরিকল্পনায় যোগ হয়েছে। |
| 459 | Todo | Deleted: {title} | মোছা হয়েছে: {title} |
| 460 | History, Planner, Todo | Subject | বিষয় |
| 461 | Todo | Estimated time | আনুমানিক সময় |
| 462 | Todo | Tasks left | বাকি কাজ |
| 463 | Todo | Focused today | আজকের মনোযোগ |
| 464 | Todo | Completed today | আজ সম্পন্ন |
| 465 | Todo | Daily goal | দৈনিক লক্ষ্য |
| 466 | Todo | Pomodoros of focused time today, of your goal (Settings → Pomodoro) | আজকের মনোযোগী সময়ের Pomodoro, আপনার লক্ষ্যের মধ্যে (সেটিংস → Pomodoro) |
| 467 | Todo | {list} tasks | {list}-এর কাজ |
| 468 | Todo | Move {title} up | {title} ওপরে সরান |
| 469 | Todo | Move {title} down | {title} নিচে সরান |
| 470 | Todo | Keys: N new task · Ctrl+K search · on a task: Enter open, Space complete, Delete | কী: N নতুন কাজ · Ctrl+K খুঁজুন · কোনো কাজে: Enter খুলুন, Space সম্পন্ন, Delete মুছুন |
| 471 | Routines, Todo | Undo | ফিরিয়ে নিন |
| 472 | Todo, todo | Tomorrow | আগামীকাল |
| 473 | Todo | repeats | ফিরে আসে |
| 474 | Todo | {done}/{all} steps | {done}/{all} ধাপ |
| 475 | Todo | Overdue | সময় পেরিয়ে গেছে |
| 476 | Todo | Type a task above and press Enter. Start it to study for it with the camera on; its minutes add up here. | ওপরে একটি কাজ লিখে Enter চাপুন। ক্যামেরা চালু রেখে এর জন্য পড়তে “শুরু করুন” চাপুন; এর মিনিট এখানে যোগ হবে। |
| 477 | Todo | Nothing completed yet | এখনো কিছু সম্পন্ন হয়নি |
| 478 | Todo | Tick a task and it moves here. | কোনো কাজে টিক দিলে সেটি এখানে চলে আসে। |
| 479 | Todo | Nothing due today | আজ কিছু জমা নেই |
| 480 | Todo | Tasks due today or earlier show here. | আজ বা আগে জমার কাজগুলো এখানে দেখা যায়। |
| 481 | Todo | Nothing due tomorrow | আগামীকাল কিছু জমা নেই |
| 482 | Todo | Type “tomorrow” in a task, or add it here. | কাজের মধ্যে “আগামীকাল” লিখুন, বা এখানে যোগ করুন। |
| 483 | Todo | Nothing due this week | এই সপ্তাহে কিছু জমা নেই |
| 484 | Todo | Tasks with a due date this week show here. | এই সপ্তাহে জমার তারিখের কাজগুলো এখানে দেখা যায়। |
| 485 | Todo | No tasks with a due date | জমার তারিখসহ কোনো কাজ নেই |
| 486 | Todo | Give a task a due date and it shows here. | কোনো কাজে জমার তারিখ দিলে সেটি এখানে দেখা যাবে। |
| 487 | Todo | No open tasks here | এখানে কোনো বাকি কাজ নেই |
| 488 | Todo | Add one above. | ওপরে একটি যোগ করুন। |
| 489 | Todo, setup | Lists | তালিকা |
| 490 | Routines, Todo | Subjects | বিষয় |
| 491 | Todo | New name for {name} | {name}-এর নতুন নাম |
| 492 | Todo | Rename | নাম বদলান |
| 493 | Todo | Delete the subject “{name}”? Its tasks stay, without a subject. | “{name}” বিষয়টি মুছবেন? এর কাজগুলো থাকবে, বিষয় ছাড়া। |
| 494 | Todo | New subject | নতুন বিষয় |
| 495 | Todo | + Subject | + বিষয় |
| 496 | Todo | Subject name | বিষয়ের নাম |
| 497 | Todo | New task | নতুন কাজ |
| 498 | Todo | Add a task, e.g. “Essay #English friday ~3” | একটি কাজ যোগ করুন, যেমন “রচনা #বাংলা শুক্রবার ~৩” |
| 499 | Todo | Keep “{word}” as text | “{word}” লেখা হিসেবেই রাখুন |
| 500 | Todo | Estimate | আনুমানিক |
| 501 | Todo | Enter to add | যোগ করতে Enter |
| 502 | Todo | Enter to add (no due date) | যোগ করতে Enter (জমার তারিখ নেই) |
| 503 | Todo | Estimated pomodoros | আনুমানিক Pomodoro |
| 504 | Todo | Task details | কাজের বিস্তারিত |
| 505 | Todo | Title | শিরোনাম |
| 506 | Todo | Notes | নোট |
| 507 | Todo | Steps | ধাপ |
| 508 | Todo | Remove step {title} | {title} ধাপটি সরান |
| 509 | Todo | Add a step | একটি ধাপ যোগ করুন |
| 510 | Todo | Add a step and press Enter | একটি ধাপ লিখে Enter চাপুন |
| 511 | Todo | Due date | জমার তারিখ |
| 512 | Todo | Repeat | ফিরে আসা |
| 513 | Todo | None | নেই |
| 514 | Todo | Priority | গুরুত্ব |
| 515 | Todo | Delete task | কাজ মুছুন |
| 516 | Todo | Search tasks | কাজ খুঁজুন |
| 517 | Todo | Search titles, notes and steps | শিরোনাম, নোট ও ধাপে খুঁজুন |
| 518 | Todo | Nothing found. | কিছু পাওয়া যায়নি। |
| 519 | Report, Todo, todo | {n} pomodoro | {n}টি Pomodoro |
| 520 | Report, Todo, todo | {n} pomodoros | {n}টি Pomodoro |
| 521 | Todo | Focused on this task: {time} ({n} pomodoro of {min} min), camera-checked | এই কাজে মনোযোগ: {time} ({min} মিনিটের {n}টি Pomodoro), ক্যামেরায় যাচাই করা |
| 522 | Todo | Focused on this task: {time} ({n} pomodoros of {min} min), camera-checked | এই কাজে মনোযোগ: {time} ({min} মিনিটের {n}টি Pomodoro), ক্যামেরায় যাচাই করা |
| 523 | Tour | {k} of {all} | {k} / {all} |
| 524 | Tour | Skip tour | পরিচিতি বাদ দিন |
| 525 | Workstations | Same desk, same chair and the camera where it was? Your saved calibration still fits, no need to calibrate again. Moved the laptop or camera, changed chair, or you sit differently? Calibrate again and update the workstation. | একই টেবিল, একই চেয়ার আর ক্যামেরা আগের জায়গায়? তাহলে সংরক্ষিত Calibrationই চলবে, আবার calibrate করার দরকার নেই। ল্যাপটপ বা ক্যামেরা সরিয়েছেন, চেয়ার বদলেছেন, বা অন্যভাবে বসছেন? আবার calibrate করে জায়গাটি হালনাগাদ করুন। |
| 526 | Workstations | + New place | + নতুন জায়গা |
| 527 | Workstations | Workstation | পড়ার জায়গা |
| 528 | Workstations | Not saved (this time only) | সংরক্ষিত নয় (শুধু এবারের জন্য) |
| 529 | Workstations | Not calibrated | Calibrate করা হয়নি |
| 530 | Workstations | + New place… | + নতুন জায়গা… |
| 531 | Workstations | Delete the workstation “{name}”? | “{name}” জায়গাটি মুছবেন? |
| 532 | Workstations | Delete | মুছুন |
| 533 | Workstations | Not saved: | সংরক্ষিত নয়: |
| 534 | Workstations | Name, e.g. Desk at home | নাম, যেমন বাড়ির টেবিল |
| 535 | Workstations | Save as workstation | পড়ার জায়গা হিসেবে সংরক্ষণ করুন |
| 536 | Workstations | No saved workstations yet. Calibrate on the Study tab (Place and calibration), then save it with a name. | এখনো কোনো সংরক্ষিত জায়গা নেই। পড়ার পাতায় (জায়গা ও Calibration) calibrate করুন, তারপর একটা নাম দিয়ে সংরক্ষণ করুন। |
| 537 | Workstations | reading angle {angle}° · activities {state} | পড়ার কোণ {angle}° · কাজের ধরন {state} |
| 538 | Workstations | not calibrated | Calibrate করা হয়নি |
| 539 | Workstations | in use | ব্যবহৃত হচ্ছে |
| 540 | Workstations | Use | ব্যবহার করুন |
| 541 | History, accounting | Focused | মনোযোগী |
| 542 | accounting | Writing | লেখা |
| 543 | accounting | Reading | পড়া |
| 544 | accounting | Speaking | কথা বলা |
| 545 | accounting | Idle | চুপচাপ |
| 546 | accounting | Looking away | অন্য দিকে তাকানো |
| 547 | accounting | Phone | ফোন |
| 548 | accounting | Phone call | ফোন কল |
| 549 | accounting | Looking down | নিচে তাকানো |
| 550 | accounting | Away | অনুপস্থিত |
| 551 | accounting | Blocked app: {name} | বন্ধ করা অ্যাপ: {name} |
| 552 | accounting | phone | ফোন |
| 553 | accounting | {n} phone | {n} ফোন |
| 554 | accounting | looking down | নিচে তাকানো |
| 555 | accounting | {n} looking down | {n} নিচে তাকানো |
| 556 | accounting | left | উঠে যাওয়া |
| 557 | accounting | {n} left | {n} উঠে যাওয়া |
| 558 | accounting | looking away | অন্য দিকে তাকানো |
| 559 | accounting | {n} looking away | {n} অন্য দিকে তাকানো |
| 560 | accounting | blocked site | বন্ধ করা সাইট |
| 561 | accounting | {n} blocked site | {n} বন্ধ করা সাইট |
| 562 | accounting | {n} blocked sites | {n} বন্ধ করা সাইট |
| 563 | accounting | blocked app | বন্ধ করা অ্যাপ |
| 564 | accounting | {n} blocked app | {n} বন্ধ করা অ্যাপ |
| 565 | accounting | {n} blocked apps | {n} বন্ধ করা অ্যাপ |
| 566 | accounting | {n} of {planned} minutes focused. | {planned} মিনিটের মধ্যে {n} মিনিট মনোযোগ। |
| 567 | accounting | The camera was off, so distractions were not checked. | ক্যামেরা বন্ধ ছিল, তাই মনোযোগ নষ্ট হওয়া দেখা হয়নি। |
| 568 | accounting | Your phone cost you {amount}. | ফোনের কারণে {amount} নষ্ট হয়েছে। |
| 569 | accounting | Looking down cost you {amount}. | নিচে তাকানোর কারণে {amount} নষ্ট হয়েছে। |
| 570 | accounting | Leaving the desk cost you {amount}. | টেবিল ছেড়ে যাওয়ায় {amount} নষ্ট হয়েছে। |
| 571 | accounting | Looking away cost you {amount}. | অন্য দিকে তাকানোর কারণে {amount} নষ্ট হয়েছে। |
| 572 | accounting | Sleepiness cost you {amount}. | ঘুম ঘুম ভাবের কারণে {amount} নষ্ট হয়েছে। |
| 573 | accounting | Sleepy | ঘুম ঘুম ভাব |
| 574 | accounting | sleepy | ঘুম ঘুম ভাব |
| 575 | accounting | {n} sleepy | {n} ঘুম ঘুম ভাব |
| 576 | accounting | Wake up | জেগে উঠুন |
| 577 | Study | Sit up and open your eyes. If you are very tired, take a break. | সোজা হয়ে বসুন আর চোখ খুলুন। খুব ক্লান্ত লাগলে Break নিন। |
| 578 | Study | You look sleepy. Take a short break? | আপনাকে ঘুম ঘুম লাগছে। একটু Break নেবেন? |
| 579 | Settings | Sleepy alarm | ঘুমের অ্যালার্ম |
| 580 | Settings | eyes closed {eyes} s, or head down on the desk {head} s (times in Advanced) | চোখ {eyes} সেকেন্ড বন্ধ, বা টেবিলে মাথা রেখে {head} সেকেন্ড (সময় উন্নত অংশে) |
| 581 | Settings | Sleepy: eyes closed, seconds before the alarm | ঘুম ঘুম ভাব: চোখ বন্ধ, অ্যালার্মের আগে কত সেকেন্ড |
| 582 | Settings | Sleepy: head down on the desk, seconds before the alarm | ঘুম ঘুম ভাব: টেবিলে মাথা রাখা, অ্যালার্মের আগে কত সেকেন্ড |
| 583 | Settings | Sleepy: eyes count as closed above (0-1) | ঘুম ঘুম ভাব: এর বেশি হলে চোখ বন্ধ ধরা হবে (০-১) |
| 584 | accounting | No distractions seen. | মনোযোগ নষ্ট হতে দেখা যায়নি। |
| 585 | accounting | No phone pickups this week or last week. | এই সপ্তাহে বা গত সপ্তাহে ফোন তোলা হয়নি। |
| 586 | accounting | {now} this week, the same as last week. | এই সপ্তাহে {now}বার, গত সপ্তাহের সমান। |
| 587 | accounting | {now} this week, {diff} fewer than last week. | এই সপ্তাহে {now}বার, গত সপ্তাহের চেয়ে {diff}বার কম। |
| 588 | accounting | {now} this week, {diff} more than last week. | এই সপ্তাহে {now}বার, গত সপ্তাহের চেয়ে {diff}বার বেশি। |
| 589 | accounting | {n} second | {n} সেকেন্ড |
| 590 | accounting | {n} seconds | {n} সেকেন্ড |
| 591 | accounting | {n} minute | {n} মিনিট |
| 592 | accounting | {n} minutes | {n} মিনিট |
| 593 | noise | White | White noise |
| 594 | noise | Pink | Pink noise |
| 595 | noise | Brown | Brown noise |
| 596 | sounds | Beeping | বিপ বিপ |
| 597 | sounds | Siren | সাইরেন |
| 598 | sounds | Loud chime | জোরে ঘণ্টা |
| 599 | useSession | Goal reached! | লক্ষ্য পূরণ হয়েছে! |
| 600 | useSession | You studied {min} focused minutes. | আপনি {min} মিনিট মনোযোগ দিয়ে পড়েছেন। |
| 601 | useSession | Back to your studies! | পড়ায় ফিরুন! |
| 602 | useSession | Desk Watch: browser extension not connected | Desk Watch: ব্রাউজার এক্সটেনশন যুক্ত নেই |
| 603 | useSession | Sites cannot be blocked in this browser. Set up the extension in Settings → Blocker mode. | এই ব্রাউজারে সাইট বন্ধ করা যাবে না। সেটিংস → Blocker mode-এ এক্সটেনশন চালু করুন। |
| 604 | camera | Your face is visible. | আপনার মুখ দেখা যাচ্ছে। |
| 605 | camera | Your face is often not found. Point the camera at your face. | আপনার মুখ প্রায়ই পাওয়া যাচ্ছে না। ক্যামেরা মুখের দিকে ঘোরান। |
| 606 | camera | You are far from the camera. Move it closer, or sit closer. | আপনি ক্যামেরা থেকে দূরে আছেন। ক্যামেরা কাছে আনুন, বা কাছে বসুন। |
| 607 | camera | The camera is too close. Move it back so your hands and desk fit in the picture. | ক্যামেরা খুব কাছে। পেছনে সরান যাতে হাত আর টেবিল ছবিতে আসে। |
| 608 | camera | Distance is good. | দূরত্ব ঠিক আছে। |
| 609 | camera | Your face is in the lower half of the picture. Tilt the camera down a little less, or raise it, so your face is in the top half and the desk in the bottom half. | আপনার মুখ ছবির নিচের অর্ধেকে। ক্যামেরা একটু কম নিচু করুন বা উঁচু করুন, যাতে মুখ ওপরের অর্ধেকে আর টেবিল নিচের অর্ধেকে থাকে। |
| 610 | camera | Your face is at the very top edge. Tilt the camera up a little. | আপনার মুখ একদম ওপরের কিনারায়। ক্যামেরা একটু ওপরে কাত করুন। |
| 611 | camera | Face is in the top half, desk below: good. | মুখ ওপরের অর্ধেকে, টেবিল নিচে: ঠিক আছে। |
| 612 | camera | Your hands on the desk are visible. | টেবিলে আপনার হাত দেখা যাচ্ছে। |
| 613 | camera | Your hands on the desk are not visible. Tilt the camera down or move it further back. Phone and writing detection need your hands in view. | টেবিলে আপনার হাত দেখা যাচ্ছে না। ক্যামেরা নিচে কাত করুন বা আরও পেছনে সরান। ফোন আর লেখা শনাক্ত করতে হাত দেখা দরকার। |
| 614 | camera | The picture is dark. Turn on a light in front of you. | ছবি অন্ধকার। সামনে একটা আলো জ্বালান। |
| 615 | camera | The light is behind you, so your face is dark. Face the window or lamp instead. | আলো আপনার পেছনে, তাই মুখ অন্ধকার। জানালা বা বাতির দিকে মুখ করে বসুন। |
| 616 | camera | Lighting is good. | আলো ঠিক আছে। |
| 617 | camera | Camera is busy: another app is using it | ক্যামেরা ব্যস্ত: অন্য একটি অ্যাপ এটি ব্যবহার করছে |
| 618 | camera | Close the other app (a video call or a browser tab), then try again. | অন্য অ্যাপটি (ভিডিও কল বা ব্রাউজারের ট্যাব) বন্ধ করে আবার চেষ্টা করুন। |
| 619 | camera | Camera is blocked | ক্যামেরা বন্ধ করা আছে |
| 620 | camera | Allow camera access in Windows Settings → Privacy & security → Camera, then try again. | Windows Settings → Privacy & security → Camera-তে ক্যামেরার অনুমতি দিয়ে আবার চেষ্টা করুন। |
| 621 | camera | No camera found | কোনো ক্যামেরা পাওয়া যায়নি |
| 622 | camera | Plug in a camera, or pick another one in Settings, then try again. | একটি ক্যামেরা লাগান, বা সেটিংসে অন্যটি বেছে নিন, তারপর আবার চেষ্টা করুন। |
| 623 | camera | The camera did not start | ক্যামেরা চালু হয়নি |
| 624 | camera | Try again. If it keeps failing, restart Desk Watch. | আবার চেষ্টা করুন। বারবার ব্যর্থ হলে Desk Watch আবার চালু করুন। |
| 625 | day | Study block | পড়ার ব্লক |
| 626 | day | {from}–{to} · weekly block | {from}–{to} · সাপ্তাহিক ব্লক |
| 627 | day | done | সম্পন্ন |
| 628 | day | task | কাজ |
| 629 | day | running | চলছে |
| 630 | day | {m} min focused | {m} মিনিট মনোযোগ |
| 631 | day | Study session | পড়ার Session |
| 632 | day | {n} of {goal} | {goal}-এর মধ্যে {n} |
| 633 | day | Estimated {est} pomodoro ({time}), took {took}. | আনুমানিক {est}টি Pomodoro ({time}), লেগেছে {took}টি। |
| 634 | day | Estimated {est} pomodoros ({time}), took {took}. | আনুমানিক {est}টি Pomodoro ({time}), লেগেছে {took}টি। |
| 635 | focus | Work, then a short break; a long break after a few | কাজ, তারপর ছোট Break; কয়েকটির পরে Long break |
| 636 | focus | Countdown | Countdown |
| 637 | focus | Any length, counts down | যেকোনো দৈর্ঘ্য, উল্টো দিকে গোনে |
| 638 | focus | Count-up | Count-up |
| 639 | focus | A stopwatch, up to a limit | স্টপওয়াচ, একটা সীমা পর্যন্ত |
| 640 | focus | {done} of {est} pomodoros | {est}টির মধ্যে {done}টি Pomodoro |
| 641 | focus | pomodoro {k} of {every} | {every}টির মধ্যে {k} নম্বর Pomodoro |
| 642 | focus | Black | কালো |
| 643 | focus | Dark grey | গাঢ় ধূসর |
| 644 | focus | Deep green | গাঢ় সবুজ |
| 645 | focus | Deep blue | গাঢ় নীল |
| 646 | power | Lighter phone model | হালকা ফোন-মডেল |
| 647 | power | Lighter phone model, 2 checks a second | হালকা ফোন-মডেল, সেকেন্ডে ২ বার দেখা |
| 648 | setup | Camera images are never uploaded and never saved, except test clips you choose to record on the Debug tab. | ক্যামেরার ছবি কখনো আপলোড বা সংরক্ষণ করা হয় না, শুধু Debug ট্যাবে আপনি নিজে যে টেস্ট ক্লিপ রেকর্ড করেন সেগুলো ছাড়া। |
| 649 | setup | Face | মুখ |
| 650 | setup | Raise the camera or tilt it up so it sees your face. | ক্যামেরা উঁচু করুন বা ওপরে কাত করুন যাতে মুখ দেখা যায়। |
| 651 | setup | Hands | হাত |
| 652 | setup | Put both hands on the desk. Tilt the camera down or move it back until it sees them. | দুই হাত টেবিলে রাখুন। হাত দেখা না যাওয়া পর্যন্ত ক্যামেরা নিচে কাত করুন বা পেছনে সরান। |
| 653 | setup | Desk | টেবিল |
| 654 | setup | Your hands are high in the picture. Tilt the camera down so the desk fills the lower part. | ছবিতে আপনার হাত অনেক ওপরে। ক্যামেরা নিচে কাত করুন যাতে নিচের অংশ টেবিলে ভরে যায়। |
| 655 | setup | Tilt the camera down so your desk and hands fill the lower part of the picture. | ক্যামেরা নিচে কাত করুন যাতে ছবির নিচের অংশে টেবিল আর হাত আসে। |
| 656 | setup | Study as you normally would. In a moment you will pick up your phone. | স্বাভাবিকভাবে পড়ুন। একটু পরে আপনি ফোন তুলবেন। |
| 657 | setup | Now pick up your phone and look at it. | এবার ফোন তুলে সেদিকে তাকান। |
| 658 | setup | That is the alarm. Put the phone down. | এটাই অ্যালার্ম। ফোন নামিয়ে রাখুন। |
| 659 | setup | The clock is running again. That is how a session works. | ঘড়ি আবার চলছে। Session এভাবেই কাজ করে। |
| 660 | setup | The phone alarm did not ring within 10 seconds. The camera may not see your hands well: check the aim. | ১০ সেকেন্ডের মধ্যে ফোনের অ্যালার্ম বাজেনি। ক্যামেরা হয়তো আপনার হাত ভালো দেখছে না: ক্যামেরার দিক দেখুন। |
| 661 | setup | Pick how many focused minutes you want to study. | কত মিনিট মনোযোগ দিয়ে পড়তে চান বেছে নিন। |
| 662 | setup | Rings an alarm when you pick up your phone, leave or look away. | ফোন তুললে, উঠে গেলে বা অন্য দিকে তাকালে অ্যালার্ম বাজায়। |
| 663 | setup | Blocks the sites and apps on your list while you study. | পড়ার সময় আপনার তালিকার সাইট ও অ্যাপ বন্ধ রাখে। |
| 664 | setup | Starts the session. The clock only runs while you are studying. | Session শুরু করে। আপনি পড়লে তবেই ঘড়ি চলে। |
| 665 | setup | Link a task, calibrate your place, edit block lists or show the camera. | কোনো কাজ যুক্ত করুন, জায়গা calibrate করুন, ব্লক তালিকা বদলান বা ক্যামেরা দেখুন। |
| 666 | setup | Your tasks and weekly study blocks. A block reminds you when it starts. | আপনার কাজ আর সাপ্তাহিক পড়ার ব্লক। ব্লক শুরু হলে মনে করিয়ে দেয়। |
| 667 | setup | Every session, with your focused time and what distracted you. | প্রতিটি Session, আপনার মনোযোগের সময় আর কী আপনার মনোযোগ নষ্ট করেছে। |
| 668 | setup | Four views | চার ধরনের দেখা |
| 669 | setup | Your to-do list, a board (to do, doing, done), your week, and one day on a time line. | আপনার কাজের তালিকা, একটি Board (করতে হবে, চলছে, সম্পন্ন), আপনার সপ্তাহ, আর সময়রেখায় একটি দিন। |
| 670 | setup | Today, tomorrow, this week and more, and the subjects you make. Each shows what is left. | আজ, আগামীকাল, এই সপ্তাহ ও আরও, আর আপনার বানানো বিষয়গুলো। প্রতিটিতে দেখায় কী বাকি। |
| 671 | setup | Add a task | একটি কাজ যোগ করুন |
| 672 | setup | Type it and press Enter. Words like tomorrow, #Physics, !1 or ~3 become chips. | লিখে Enter চাপুন। আগামীকাল, #পদার্থবিজ্ঞান, !১ বা ~৩-এর মতো শব্দ আলাদা চিহ্ন হয়ে যায়। |
| 673 | setup | Pick a period | সময়কাল বেছে নিন |
| 674 | setup | Today, the last 7 days or the last 30 days. | আজ, শেষ ৭ দিন বা শেষ ৩০ দিন। |
| 675 | setup | Three numbers | তিনটি সংখ্যা |
| 676 | setup | Focused time, distractions and your longest stretch of focus. | মনোযোগের সময়, মনোযোগ নষ্ট হওয়া আর সবচেয়ে লম্বা টানা মনোযোগ। |
| 677 | setup | Each day | প্রতিটি দিন |
| 678 | setup | Click a day to see its sessions and their reports. | কোনো দিনে ক্লিক করলে সেই দিনের Session আর তাদের রিপোর্ট দেখবেন। |
| 679 | setup | Default length, break length and strict mode. | স্বাভাবিক দৈর্ঘ্য, Break-এর দৈর্ঘ্য আর Strict mode। |
| 680 | setup | Detection thresholds, workstations and the Debug tab. Most people never need it. | শনাক্তকরণের সীমা, পড়ার জায়গা আর Debug ট্যাব। বেশিরভাগ মানুষের কখনো দরকার হয় না। |
| 681 | todo | Planned | পরিকল্পিত |
| 682 | todo | All tasks | সব কাজ |
| 683 | todo | Completed | সম্পন্ন |
| 684 | todo | {h} h {m} min | {h} ঘণ্টা {m} মিনিট |
| 685 | todo | {h} h | {h} ঘণ্টা |
| 686 | todo | High priority | বেশি গুরুত্ব |
| 687 | todo | Normal priority | সাধারণ গুরুত্ব |
| 688 | todo | Low priority | কম গুরুত্ব |
| 689 | todo | Due {date} | জমা {date} |
| 690 | todo | #{name} (new) | #{name} (নতুন) |
| 691 | todo | Due today | আজ জমা |
| 692 | todo | Due tomorrow | আগামীকাল জমা |
| 693 | backup | This backup is damaged. | এই ব্যাকআপটি নষ্ট। |
| 694 | backup | This is not a Desk Watch backup. | এটি Desk Watch-এর ব্যাকআপ নয়। |
| 695 | backup | This backup was made by a newer version of Desk Watch. | এই ব্যাকআপটি Desk Watch-এর নতুন কোনো সংস্করণে তৈরি। |
| 696 | backup | This file could not be read as a Desk Watch backup. | এই ফাইলটি Desk Watch-এর ব্যাকআপ হিসেবে পড়া গেল না। |
| 697 | backup, main | Backup not found. | ব্যাকআপ পাওয়া যায়নি। |
| 698 | db | This data was made by a newer version of Desk Watch (database version {v}). Please update the app. | এই ডেটা Desk Watch-এর নতুন কোনো সংস্করণে তৈরি (ডেটাবেস সংস্করণ {v})। দয়া করে অ্যাপটি হালনাগাদ করুন। |
| 699 | db | No such block set. | এমন কোনো ব্লক সেট নেই। |
| 700 | db | There is no block set. Make one first. | কোনো ব্লক সেট নেই। আগে একটি তৈরি করুন। |
| 701 | db | Give the set a name. | সেটটির একটি নাম দিন। |
| 702 | db | There is already a set called "{name}". | "{name}" নামে একটি সেট আগে থেকেই আছে। |
| 703 | db | Keep at least one block set. | অন্তত একটি ব্লক সেট রাখুন। |
| 704 | db | This is not a Desk Watch export file. | এটি Desk Watch-এর রপ্তানি করা ফাইল নয়। |
| 705 | db | This file was made by a newer version of Desk Watch. | এই ফাইলটি Desk Watch-এর নতুন কোনো সংস্করণে তৈরি। |
| 706 | db | Unknown table "{name}" in the file. | ফাইলে অচেনা টেবিল "{name}"। |
| 707 | db | "{name}" is not a list. | "{name}" কোনো তালিকা নয়। |
| 708 | db | Bad row in "{name}". | "{name}"-এ ভুল সারি। |
| 709 | db | Unknown column "{col}" in "{name}". | "{name}"-এ অচেনা কলাম "{col}"। |
| 710 | db | Bad value for "{col}" in "{name}". | "{name}"-এ "{col}"-এর মান ভুল। |
| 711 | db | That subject no longer exists. | ওই বিষয়টি আর নেই। |
| 712 | db | Give the subject a name. | বিষয়টির একটি নাম দিন। |
| 713 | db | There is already a subject called "{name}". | "{name}" নামে একটি বিষয় আগে থেকেই আছে। |
| 714 | db | That task no longer exists. | ওই কাজটি আর নেই। |
| 715 | db | That block set no longer exists. | ওই ব্লক সেটটি আর নেই। |
| 716 | main | Open Desk Watch | Desk Watch খুলুন |
| 717 | main | Quit | বন্ধ করুন |
| 718 | main | Desk Watch cannot open its data | Desk Watch তার ডেটা খুলতে পারছে না |
| 719 | main | File: {path} | ফাইল: {path} |
| 720 | main | Desk Watch is still watching | Desk Watch এখনো দেখছে |
| 721 | main | Your session keeps running. Click the tray icon to open it, or end the session first to quit. | আপনার Session চলছে। খুলতে ট্রে-এর আইকনে ক্লিক করুন, বা বন্ধ করতে আগে Session শেষ করুন। |
| 722 | main | Desk Watch: session running | Desk Watch: Session চলছে |
| 723 | main | During a session you can only add blocked sites and apps. | Session চলার সময় শুধু বন্ধ করার সাইট ও অ্যাপ যোগ করা যায়। |
| 724 | main | Block sets cannot be changed during a session. | Session চলার সময় ব্লক সেট বদলানো যায় না। |
| 725 | main | End your session first. | আগে Session শেষ করুন। |
| 726 | main | Nothing was changed. | কিছুই বদলায়নি। |
| 727 | main | Backup failed. | ব্যাকআপ হয়নি। |
| 728 | main | Restore failed. | পুনরুদ্ধার হয়নি। |
| 729 | main | Study block at {time}: {task} | {time}-এ পড়ার ব্লক: {task} |
| 730 | main | {min} min. Click to get it ready in Desk Watch. | {min} মিনিট। Desk Watch-এ তৈরি করে রাখতে ক্লিক করুন। |
| 731 | planner | Pick a day. | একটি দিন বেছে নিন। |
| 732 | planner | Pick a start time. | শুরুর সময় বেছে নিন। |
| 733 | planner | Length must be 5 to 600 minutes. | দৈর্ঘ্য ৫ থেকে ৬০০ মিনিট হতে হবে। |
| 734 | planner | A block must end by midnight. | ব্লক মাঝরাতের মধ্যে শেষ হতে হবে। |
| 735 | planner | It overlaps the block at {from}–{to}. | এটি {from}–{to}-এর ব্লকের সঙ্গে মিলে যাচ্ছে। |
| 736 | planner | Give the task a title. | কাজটির একটি শিরোনাম দিন। |
| 737 | planner | The due date is not a date. | জমার তারিখটি কোনো তারিখ নয়। |
| 738 | planner | The estimate must be 1 to 9999 minutes. | আনুমানিক সময় ১ থেকে ৯৯৯৯ মিনিট হতে হবে। |
| 739 | planner | The time is not a time. | সময়টি কোনো সময় নয়। |
| 740 | db | Give the routine a name. | রুটিনের একটি নাম দিন। |
| 741 | db | That routine no longer exists. | রুটিনটি আর নেই। |
| 742 | db | A routine with that name already exists. | এই নামে একটি রুটিন আগে থেকেই আছে। |
| 743 | db | That block is not on that day. | সেদিন এই ব্লকটি নেই। |
| 744 | db | My routine | আমার রুটিন |
| 745 | routines | Time slot {n}: pick at least one day. | সময় {n}: অন্তত একটি দিন বেছে নিন। |
| 746 | routines | {day}: {problem} | {day}: {problem} |
| 747 | BlockWarning | {name} is blocked. Close it, or the alarm rings in {s} s. | {name} বন্ধ রাখার তালিকায় আছে। এটি বন্ধ করুন, নইলে {s} সেকেন্ডে অ্যালার্ম বাজবে। |
| 748 | BlockWarning | {site} is blocked. Going back to it within 2 minutes, or a 3rd blocked visit this session, rings the alarm. | {site} বন্ধ রাখার তালিকায় আছে। ২ মিনিটের মধ্যে আবার গেলে, বা এই Session-এ তৃতীয়বার বন্ধ সাইটে গেলে, অ্যালার্ম বাজবে। |
| 749 | accounting | Blocked site: {name} | বন্ধ করা সাইট: {name} |
| 750 | Routines | Routine | রুটিন |
| 751 | Routines | None (no blocks) | কোনোটি নয় (কোনো ব্লক নেই) |
| 752 | Routines | Edit routine | রুটিন বদলান |
| 753 | Routines | New routine | নতুন রুটিন |
| 754 | Routines | One routine is on at a time. Switching or editing changes today and later; past days keep their plan. | একবারে একটি রুটিন চালু থাকে। বদলালে বা সম্পাদনা করলে আজ ও পরের দিনগুলো বদলায়; আগের দিনগুলোর পরিকল্পনা আগের মতোই থাকে। |
| 755 | Routines | Previous week | আগের সপ্তাহ |
| 756 | Routines | Next week | পরের সপ্তাহ |
| 757 | Routines | No routine yet | এখনো কোনো রুটিন নেই |
| 758 | Routines | A routine is your study times for a week, e.g. "HSC weekly": each time slot on one or more days. When a block starts, Desk Watch reminds you. | রুটিন হলো এক সপ্তাহের পড়ার সময়, যেমন "HSC সাপ্তাহিক": প্রতিটি সময় এক বা একাধিক দিনে। কোনো ব্লক শুরু হলে Desk Watch মনে করিয়ে দেয়। |
| 759 | Routines | Skipped this day | এই দিন বাদ |
| 760 | Routines | Moved this day | এই দিন সরানো হয়েছে |
| 761 | Routines | Skip this day | এই দিন বাদ দিন |
| 762 | Routines | Change this day | এই দিন বদলান |
| 763 | Routines | End time | শেষের সময় |
| 764 | Routines | Save | সংরক্ষণ করুন |
| 765 | Routines | Routine editor | রুটিন সম্পাদনা |
| 766 | Routines | Name | নাম |
| 767 | Routines | e.g. HSC weekly | যেমন HSC সাপ্তাহিক |
| 768 | Routines | On (switches the others off) | চালু (অন্যগুলো বন্ধ হয়ে যাবে) |
| 769 | Routines | Changes apply from today; past days keep their plan, and sessions and stats never change. | পরিবর্তন আজ থেকে কার্যকর; আগের দিনগুলোর পরিকল্পনা থাকে, আর Session ও পরিসংখ্যান কখনো বদলায় না। |
| 770 | Routines | Days | দিন |
| 771 | Routines | For | কিসের জন্য |
| 772 | Routines | Days of time slot {n} | সময় {n}-এর দিনগুলো |
| 773 | Routines | Start of time slot {n} | সময় {n}-এর শুরু |
| 774 | Routines | End of time slot {n} | সময় {n}-এর শেষ |
| 775 | Routines | What time slot {n} is for | সময় {n} কিসের জন্য |
| 776 | Routines | Study (no subject) | পড়া (কোনো বিষয় নয়) |
| 777 | Routines | Tasks | কাজ |
| 778 | Routines | Remove time slot {n} | সময় {n} সরান |
| 779 | Routines | + Time slot | + সময় |
| 780 | Routines | Copy this day | এই দিনটি কপি করুন |
| 781 | Routines | to | থেকে এই দিনগুলোতে |
| 782 | Routines | Copy to these days | এই দিনগুলোতে কপি করুন |
| 783 | Routines | Copy | কপি করুন |
| 784 | Routines | Nothing was saved: | কিছুই সংরক্ষণ হয়নি: |
| 785 | Routines | Save routine | রুটিন সংরক্ষণ করুন |
| 786 | Routines | Delete the routine “{name}”? Its blocks go too (also from past days’ plan); sessions and stats stay. | রুটিন “{name}” মুছে ফেলবেন? এর ব্লকগুলোও যাবে (আগের দিনগুলোর পরিকল্পনা থেকেও); Session ও পরিসংখ্যান থাকবে। |
| 787 | Routines | Delete routine | রুটিন মুছুন |
