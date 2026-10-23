# Bangla review (Desk Watch)

Every Bangla line in the app, next to its English. **Correct only the last column (বাংলা)** and keep:
- the words in curly brackets exactly as they are (`{name}`, `{n}`, `{time}`…): the app fills them in;
- "Desk Watch", Chrome, Edge, Windows and web addresses in English.

Numbers are turned into Bangla digits by the app itself, and dates and weekday names come from the built-in Bangla
calendar names, so they are not in this list. The Debug tab stays in English.

When you are done, tell Claude, or run `node scripts/bangla-review.mjs import` and then `npm test`.
"Where" is the file the line is used in (Study = Study tab, Todo = the to-do list, Focus = Focus mode, and so on).

802 lines. Made by `node scripts/bangla-review.mjs`.

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
| 10 | History | Focused minutes per day | প্রতিদিনের মনোযোগী মিনিট |
| 11 | History | Breakdown | বিস্তারিত হিসাব |
| 12 | Report | Timeline | সময়রেখা |
| 13 | Settings | Settings sections | সেটিংসের অংশ |
| 14 | todo | {done} min focused | {done} মিনিট মনোযোগ |
| 15 | todo | {done} of {est} min | {est} মিনিটের মধ্যে {done} মিনিট |
| 16 | todo | +{over} min over | {over} মিনিট বেশি |
| 17 | App | Tour of this screen | এই পাতার পরিচিতি |
| 18 | App | End your session first | আগে Session শেষ করুন |
| 19 | App | Run setup again | আবার সেটআপ চালান |
| 20 | App | Camera images stay on this computer. Nothing is recorded or sent, except test clips you record yourself. | ক্যামেরার ছবি এই কম্পিউটারেই থাকে। কিছুই রেকর্ড বা পাঠানো হয় না, শুধু আপনি নিজে যে টেস্ট ক্লিপ রেকর্ড করেন সেগুলো ছাড়া। |
| 21 | engine | The {model} model failed: {error} | {model} মডেল কাজ করেনি: {error} |
| 22 | engine | The {model} model stopped: {error} | {model} মডেল থেমে গেছে: {error} |
| 23 | engine | Could not load the detection models: {error} | শনাক্ত করার মডেলগুলো চালু করা গেল না: {error} |
| 24 | Calibrate | Write in your notebook, as you normally do | খাতায় লিখুন, যেমন সাধারণত লেখেন |
| 25 | Calibrate | Read your book or notes on the desk | টেবিলে রাখা বই বা নোট পড়ুন |
| 26 | Calibrate | Sit still and think, looking at the screen | স্থির হয়ে বসে ভাবুন, স্ক্রিনের দিকে তাকিয়ে |
| 27 | Calibrate | Get ready: {what} ({s}) | তৈরি হোন: {what} ({s}) |
| 28 | Calibrate | Your face was not found often enough. Raise or tilt the camera so it sees your face, then try again. | আপনার মুখ যথেষ্ট বার দেখা যায়নি। ক্যামেরা উঁচু করুন বা কাত করুন যাতে মুখ দেখা যায়, তারপর আবার চেষ্টা করুন। |
| 29 | Calibrate | Saved “{name}” | “{name}” সংরক্ষিত হয়েছে |
| 30 | Calibrate | Calibration cancelled. Nothing was changed. | Calibration বাতিল হয়েছে। কিছুই বদলায়নি। |
| 31 | Calibrate | Workstation and calibration | পড়ার জায়গা ও Calibration |
| 32 | Calibrate | What is this? | এটা কী? |
| 33 | Calibrate | Calibration (30 s): | Calibration (৩০ সেকেন্ড): |
| 34 | Calibrate | A soft beep tells you to switch after writing and after reading, and two tones play when it is over (at your alarm volume; none if it is 0). | লেখার পরে আর পড়ার পরে একটি নরম বিপ বলে দেবে পরের কাজে যেতে, আর শেষ হলে দুটি সুর বাজবে (অ্যালার্মের ভলিউমে; ভলিউম ০ হলে কোনো শব্দ নেই)। |
| 35 | Calibrate | 10 s writing, 10 s reading, 10 s thinking. Desk Watch learns how you look doing each, and your reading angle, so reading is not mistaken for looking down. Have a notebook and a book ready. | ১০ সেকেন্ড লেখা, ১০ সেকেন্ড পড়া, ১০ সেকেন্ড ভাবা। Desk Watch শিখে নেয় প্রতিটি করার সময় আপনাকে কেমন দেখায়, আর পড়ার সময় মাথা কতটা নিচু থাকে, যাতে পড়াকে নিচে তাকানো ভেবে ভুল না হয়। একটা খাতা আর একটা বই হাতের কাছে রাখুন। |
| 36 | Calibrate | Workstation: | পড়ার জায়গা: |
| 37 | Calibrate | a saved calibration for one place you study. Pick it before a session; no need to calibrate again. | যেখানে আপনি পড়েন সেই জায়গার সংরক্ষিত Calibration। Session-এর আগে এটা বেছে নিন; আবার calibrate করার দরকার নেই। |
| 38 | Calibrate | When to calibrate again: | কখন আবার calibrate করবেন: |
| 39 | Calibrate | New place: | নতুন জায়গা: |
| 40 | Calibrate | choose “+ New place…”, type its name and calibrate; it is saved when the 30 s are done. | “+ নতুন জায়গা…” বেছে নিন, নাম লিখুন আর calibrate করুন; ৩০ সেকেন্ড শেষ হলে সংরক্ষিত হবে। |
| 41 | Calibrate | Calibrate again | আবার calibrate করুন |
| 42 | Calibrate | updates the place that is selected. | বেছে নেওয়া জায়গাটি হালনাগাদ করে। |
| 43 | Calibrate | Calibrating… | Calibrate হচ্ছে… |
| 44 | Calibrate | Start calibration | Calibration শুরু করুন |
| 45 | Calibrate, Focus, Routines, Study | Cancel | বাতিল |
| 46 | Calibrate | Reading angle {angle} · activities {done} | পড়ার কোণ {angle} · কাজের ধরন {done} |
| 47 | Calibrate | Not calibrated yet: calibrate once before your first session. | এখনো calibrate করা হয়নি: প্রথম Session-এর আগে একবার calibrate করুন। |
| 48 | Calibrate | New place | নতুন জায়গা |
| 49 | Calibrate | Name, e.g. Library | নাম, যেমন লাইব্রেরি |
| 50 | Calibrate | Calibrate and save (30 s) | Calibrate করে সংরক্ষণ করুন (৩০ সেকেন্ড) |
| 51 | Calibrate | You already have a place with this name. Pick another name. | এই নামে আপনার একটি জায়গা আগে থেকেই আছে। অন্য নাম দিন। |
| 52 | Calibrate | A place with this name exists; it will be replaced. | এই নামে একটি জায়গা আছে; সেটি বদলে যাবে। |
| 53 | Calibrate | Sit at the new place the way you normally study, with a notebook and a book ready. | নতুন জায়গায় যেভাবে সাধারণত পড়েন সেভাবে বসুন, খাতা আর বই হাতের কাছে রেখে। |
| 54 | DayPlan | Previous day | আগের দিন |
| 55 | DayPlan, Planner | Day | দিন |
| 56 | DayPlan | Next day | পরের দিন |
| 57 | DayPlan, History, Todo, todo | Today | আজ |
| 58 | DayPlan | Today, {date} | আজ, {date} |
| 59 | DayPlan | Scheduled | পরিকল্পিত |
| 60 | DayPlan | Nothing scheduled: no weekly block on this weekday and no task with a time. | কিছু পরিকল্পিত নেই: এই বারে কোনো সাপ্তাহিক ব্লক নেই, সময়সহ কোনো কাজও নেই। |
| 61 | DayPlan, Focus, Planner, Tour | Done | সম্পন্ন |
| 62 | DayPlan | No sessions on this day. | এই দিনে কোনো Session নেই। |
| 63 | DayPlan | {title}, {sub}. Show the report | {title}, {sub}। রিপোর্ট দেখুন |
| 64 | DayPlan | Close the report | রিপোর্ট বন্ধ করুন |
| 65 | FirstRun | Welcome to Desk Watch | Desk Watch-এ স্বাগতম |
| 66 | FirstRun | Your camera | আপনার ক্যামেরা |
| 67 | FirstRun | Aim the camera | ক্যামেরা ঠিক দিকে রাখুন |
| 68 | FirstRun | Calibrate your place | আপনার জায়গা calibrate করুন |
| 69 | FirstRun | Connect your browser | আপনার ব্রাউজার যুক্ত করুন |
| 70 | FirstRun | Practice session | অনুশীলনের Session |
| 71 | FirstRun | Step {k} of {all} | ধাপ {k} / {all} |
| 72 | FirstRun, Settings | Language | ভাষা |
| 73 | FirstRun | Desk Watch watches your study sessions through the camera and rings an alarm when you pick up your phone, leave or look away. | Desk Watch ক্যামেরা দিয়ে আপনার পড়ার Session দেখে, আর আপনি ফোন তুললে, উঠে গেলে বা অন্য দিকে তাকালে অ্যালার্ম বাজায়। |
| 74 | FirstRun | 30 seconds: 10 writing, 10 reading, 10 thinking. Have a notebook and a book ready. Give this place a name. | ৩০ সেকেন্ড: ১০ লেখা, ১০ পড়া, ১০ ভাবা। খাতা আর বই হাতের কাছে রাখুন। এই জায়গার একটা নাম দিন। |
| 75 | FirstRun | Skip this step | এই ধাপ বাদ দিন |
| 76 | FirstRun, Tour | Next | পরের |
| 77 | FirstRun, History, Tour | Back | পেছনে |
| 78 | FirstRun | Skip setup | সেটআপ বাদ দিন |
| 79 | FirstRun, Study | Try again | আবার চেষ্টা করুন |
| 80 | FirstRun | The camera is on. | ক্যামেরা চালু আছে। |
| 81 | FirstRun, Study | Starting the camera… | ক্যামেরা চালু হচ্ছে… |
| 82 | FirstRun | Sit as you study, both hands on the desk. The picture should show your face at the top and the desk below. | যেভাবে পড়েন সেভাবে বসুন, দুই হাত টেবিলে। ছবির ওপরের দিকে আপনার মুখ আর নিচে টেবিল দেখা যাওয়া উচিত। |
| 83 | FirstRun | OK | ঠিক আছে |
| 84 | FirstRun | Optional. Lets Blocker mode block sites in Chrome or Edge. You can do this later in Settings → Advanced. | ইচ্ছামতো। এতে Blocker mode Chrome বা Edge-এ সাইট বন্ধ করতে পারে। পরে সেটিংস → উন্নত-এও করতে পারবেন। |
| 85 | FirstRun | Click Open extension folder. | “এক্সটেনশনের ফোল্ডার খুলুন”-এ ক্লিক করুন। |
| 86 | FirstRun | In Chrome open chrome://extensions (Edge: edge://extensions), switch on Developer mode, click Load unpacked and choose that folder. | Chrome-এ chrome://extensions খুলুন (Edge: edge://extensions), Developer mode চালু করুন, Load unpacked-এ ক্লিক করে ওই ফোল্ডারটি বেছে নিন। |
| 87 | FirstRun | Desk Watch asks “Connect Chrome?”: click Allow. | Desk Watch জিজ্ঞেস করবে “Chrome যুক্ত করবেন?”: অনুমতি দিন-এ ক্লিক করুন। |
| 88 | FirstRun, ScreenMode | Open extension folder | এক্সটেনশনের ফোল্ডার খুলুন |
| 89 | FirstRun, ScreenMode | Connected | যুক্ত |
| 90 | FirstRun, ScreenMode | Not connected yet | এখনো যুক্ত হয়নি |
| 91 | FirstRun | Two minutes with the camera on, so you see how a session works. It is never saved: it does not count in History or your streak. | ক্যামেরা চালু রেখে দুই মিনিট, যাতে দেখতে পান Session কীভাবে চলে। এটি কখনো সংরক্ষিত হয় না: ইতিহাসে বা ধারাবাহিকতায় গোনা হয় না। |
| 92 | FirstRun | Keep your phone near you. After 30 seconds you will be asked to pick it up. | ফোনটা কাছে রাখুন। ৩০ সেকেন্ড পরে সেটা তুলতে বলা হবে। |
| 93 | FirstRun | Start practice | অনুশীলন শুরু করুন |
| 94 | FirstRun | Skip practice | অনুশীলন বাদ দিন |
| 95 | FirstRun | This report is not saved. | এই রিপোর্ট সংরক্ষিত হয়নি। |
| 96 | FirstRun | Finish | শেষ করুন |
| 97 | FirstRun | Check the aim | ক্যামেরার দিক দেখুন |
| 98 | FirstRun | Practice: the alarm stops when you are back to studying. | অনুশীলন: আবার পড়ায় ফিরলে অ্যালার্ম থেমে যাবে। |
| 99 | FirstRun | End practice | অনুশীলন শেষ করুন |
| 100 | FirstRun, Focus, Study | Starting | শুরু হচ্ছে |
| 101 | Focus, Study, accounting | Paused | থামানো |
| 102 | Focus, accounting | Break is over | Break শেষ |
| 103 | Focus | Long break | Long break |
| 104 | Focus, Study, accounting | Break | Break |
| 105 | Focus, Todo | Time | সময় |
| 106 | Focus, Mini, Study | Pause | থামান |
| 107 | Focus | Stop | শেষ করুন |
| 108 | Focus, Study | Checking the camera… {left} | ক্যামেরা দেখা হচ্ছে… {left} |
| 109 | Focus, Study | The camera can’t see your face | ক্যামেরা আপনার মুখ দেখতে পাচ্ছে না |
| 110 | Focus, Study | Start anyway counts you as away, with the clock stopped, until the camera sees your face. | “তবুও শুরু করুন” দিলে ক্যামেরা আপনার মুখ না দেখা পর্যন্ত আপনাকে অনুপস্থিত ধরা হবে, ঘড়ি থেমে থাকবে। |
| 111 | Focus, Study | Fix it | ঠিক করুন |
| 112 | Focus, Study | Start anyway | তবুও শুরু করুন |
| 113 | FirstRun, Focus, Study | Focused time | মনোযোগের সময় |
| 114 | Focus | Time left | বাকি সময় |
| 115 | Focus | Stops at {min} min | {min} মিনিটে থামবে |
| 116 | Focus, Mini, Study | Resume | আবার চালু করুন |
| 117 | Focus, Study | Break time left | Break-এর বাকি সময় |
| 118 | Focus | Ready when you are. | আপনি তৈরি হলেই শুরু। |
| 119 | Focus | The next pomodoro starts by itself. | পরের Pomodoro নিজে থেকেই শুরু হবে। |
| 120 | Focus, Study | No alarms during your break. | Break-এর সময় কোনো অ্যালার্ম নেই। |
| 121 | Focus, Mini | Start next pomodoro | পরের Pomodoro শুরু করুন |
| 122 | Focus | Session ended | Session শেষ |
| 123 | Focus | focused on {task} | {task}-এ মনোযোগ |
| 124 | Focus | focused | মনোযোগ |
| 125 | Focus, Study, Todo | Close | বন্ধ করুন |
| 126 | Focus | Start again | আবার শুরু করুন |
| 127 | Focus, Study | Focus mode | Focus mode |
| 128 | Focus | Keep holding Esc to leave… | বের হতে Esc চেপে ধরে রাখুন… |
| 129 | Focus | Exit | বের হন |
| 130 | Focus | Focus mode options | Focus mode-এর বিকল্প |
| 131 | Focus | Timer | টাইমার |
| 132 | Focus | Sound | শব্দ |
| 133 | Focus | Background | পটভূমি |
| 134 | Focus | Today's tasks | আজকের কাজ |
| 135 | Focus | Volume | ভলিউম |
| 136 | Focus | Made on this computer; no sound files. | এই কম্পিউটারেই তৈরি; কোনো শব্দ-ফাইল নেই। |
| 137 | Focus | End the session? | Session শেষ করবেন? |
| 138 | Focus | It is saved as ending now. Or keep going in a small timer on top of your other windows. | এখনই শেষ হয়েছে বলে সংরক্ষিত হবে। অথবা অন্য উইন্ডোর ওপরে একটি ছোট টাইমারে চালিয়ে যান। |
| 139 | Focus, Study | Strict mode is on. To end early, type this sentence exactly: | Strict mode চালু আছে। আগে শেষ করতে এই বাক্যটি হুবহু লিখুন: |
| 140 | Focus, Study | Sentence | বাক্য |
| 141 | Focus | Keep going in a small window | ছোট উইন্ডোতে চালিয়ে যান |
| 142 | Focus, Study | End session | Session শেষ করুন |
| 143 | Focus | Timer mode | টাইমারের ধরন |
| 144 | Focus | Pomodoro (min) | Pomodoro (মিনিট) |
| 145 | Focus | Break (min) | Break (মিনিট) |
| 146 | Focus | Long break (min) | Long break (মিনিট) |
| 147 | Focus | Long break after | Long break কয়টির পরে |
| 148 | Focus, Settings | Number of pomodoros | Pomodoro-র সংখ্যা |
| 149 | Settings | in a Focus mode run | Focus mode-এর এক দফায় |
| 150 | Focus | Set your timer | টাইমার ঠিক করুন |
| 151 | Focus | {done} of {count} pomodoros done | {count}টির মধ্যে {done}টি Pomodoro শেষ |
| 152 | Focus | Length (min) | দৈর্ঘ্য (মিনিট) |
| 153 | Focus | Stops at (min) | থামবে (মিনিট) |
| 154 | Focus | Start the next pomodoro after a break by itself | Break-এর পরে পরের Pomodoro নিজে থেকে শুরু হোক |
| 155 | Focus | Changes apply from the next start. | পরিবর্তন পরের শুরু থেকে কার্যকর হবে। |
| 156 | Focus | Nothing due today. | আজ কোনো কাজ জমা দেওয়ার নেই। |
| 157 | Focus, Todo | Complete {title} | {title} সম্পন্ন করুন |
| 158 | Focus | Now | এখন |
| 159 | Focus | Switch | বদলান |
| 160 | Focus, History, Study | No task | কোনো কাজ নেই |
| 161 | History, Routines, todo | This week | এই সপ্তাহ |
| 162 | History | 7 days | ৭ দিন |
| 163 | History | 30 days | ৩০ দিন |
| 164 | History, Report, Routines | Loading… | লোড হচ্ছে… |
| 165 | History | No sessions yet | এখনো কোনো Session নেই |
| 166 | History | Your first session will show up here. | আপনার প্রথম Session এখানে দেখা যাবে। |
| 167 | History | Go to Study | পড়ার পাতায় যান |
| 168 | History | Period | সময়কাল |
| 169 | History | Focused minutes per day, last {days} days | প্রতিদিনের মনোযোগী মিনিট, শেষ {days} দিন |
| 170 | History | {date}: {m} focused minutes, {p} pomodoros | {date}: {m} মনোযোগী মিনিট, {p}টি Pomodoro |
| 171 | History | {m} focused min · {p} pomodoros | {m} মনোযোগী মিনিট · {p}টি Pomodoro |
| 172 | History | The number above a day is its pomodoros. | দিনের উপরের সংখ্যাটি সেদিনের Pomodoro। |
| 173 | History | All time | সব সময় |
| 174 | History | By task | কাজ অনুযায়ী |
| 175 | History | By subject | বিষয় অনুযায়ী |
| 176 | History | Stats | পরিসংখ্যান |
| 177 | History | Pomodoros | Pomodoro |
| 178 | History, Planner | No subject | কোনো বিষয় নেই |
| 179 | Planner | All subjects | সব বিষয় |
| 180 | Planner | Delete “{title}”? | “{title}” মুছে ফেলবেন? |
| 181 | Report | Task: {title} | কাজ: {title} |
| 182 | History | Click a day to see its sessions. | কোনো দিনে ক্লিক করলে সেই দিনের Session দেখবেন। |
| 183 | History | No sessions this week yet (the week started on {date}). | এই সপ্তাহে এখনো কোনো Session নেই (সপ্তাহ শুরু হয়েছে {date})। |
| 184 | History | Best day | সেরা দিন |
| 185 | History | {day}, {time} focused. | {day}, {time} মনোযোগ। |
| 186 | History | No focused time yet. | এখনো মনোযোগের সময় নেই। |
| 187 | History | Top distraction | সবচেয়ে বেশি মনোযোগ নষ্ট |
| 188 | History | None this week. | এই সপ্তাহে নেই। |
| 189 | History | Phone pickups | ফোন তোলা |
| 190 | History | The week started on {date}. | সপ্তাহ শুরু হয়েছে {date}। |
| 191 | History | Day streak: {n} day. | টানা দিন: {n} দিন। |
| 192 | History | Day streak: {n} days. | টানা দিন: {n} দিন। |
| 193 | History | {name}, {n} time. | {name}, {n} বার। |
| 194 | History | {name}, {n} times. | {name}, {n} বার। |
| 195 | Mini | Drag to move | সরাতে টেনে নিন |
| 196 | Mini | Back to full screen | পুরো স্ক্রিনে ফিরুন |
| 197 | Planner | To do | করতে হবে |
| 198 | Planner | Doing | চলছে |
| 199 | Planner | List | তালিকা |
| 200 | Planner | Board | Board |
| 201 | Planner | Week | সপ্তাহ |
| 202 | Planner | View | দেখার ধরন |
| 203 | Planner, Todo | No tasks yet | এখনো কোনো কাজ নেই |
| 204 | Planner | Type a task above and press Enter. Drag it from To do to Doing to Done. | ওপরে একটি কাজ লিখে Enter চাপুন। সেটিকে “করতে হবে” থেকে “চলছে” হয়ে “সম্পন্ন”-এ টেনে নিন। |
| 205 | Planner | Move {title} left | {title} বাঁয়ে সরান |
| 206 | Planner | Move {title} right | {title} ডানে সরান |
| 207 | Routines | Start time | শুরুর সময় |
| 208 | History, Study | Task | কাজ |
| 209 | Routines, Study, setup | Camera mode | Camera mode |
| 210 | Routines, Study, setup | Blocker mode | Blocker mode |
| 211 | Routines | Block set | ব্লক সেট |
| 212 | Routines | Set chosen on the Study tab | পড়ার পাতায় বেছে নেওয়া সেট |
| 213 | Routines | Get this block ready on the Study tab | এই ব্লকটি পড়ার পাতায় তৈরি করে রাখুন |
| 214 | Routines, Settings | Camera | ক্যামেরা |
| 215 | Routines | Blocker | Blocker |
| 216 | Routines | Timer only | শুধু টাইমার |
| 217 | Planner | Study block at {time}: {task} ({min} min) | {time}-এ পড়ার ব্লক: {task} ({min} মিনিট) |
| 218 | Planner, main | study | পড়া |
| 219 | Planner | Get it ready | তৈরি করুন |
| 220 | Planner, Study | Dismiss | সরিয়ে দিন |
| 221 | Report | Focused · {pct}% of {total} | মনোযোগ · {total}-এর {pct}% |
| 222 | Report | Longest focus streak | সবচেয়ে লম্বা টানা মনোযোগ |
| 223 | Report, accounting | Studying | পড়া চলছে |
| 224 | Report | Distracted | মনোযোগ নষ্ট |
| 225 | Report | Break / Pause | Break / থামানো |
| 226 | Report | Point at a block, or press Tab, to see what it was. | কোনো অংশ কী ছিল দেখতে তার ওপর মাউস রাখুন বা Tab চাপুন। |
| 227 | Report | Show details | বিস্তারিত দেখুন |
| 228 | Report | Session report | Session-এর রিপোর্ট |
| 229 | Report | ended early | আগেই শেষ |
| 230 | Report | goal reached | লক্ষ্য পূরণ |
| 231 | Report | No sessions this day. | এই দিনে কোনো Session নেই। |
| 232 | Report | {time} focused of {min} min | {min} মিনিটের মধ্যে {time} মনোযোগ |
| 233 | Report | Distraction | মনোযোগ নষ্ট |
| 234 | History, Report | Distractions | মনোযোগ নষ্ট |
| 235 | Report | {n} session | {n}টি Session |
| 236 | Report | {n} sessions | {n}টি Session |
| 237 | ScreenMode | Blocker mode cannot start its local connection: {error} | Blocker mode তার স্থানীয় সংযোগ চালু করতে পারছে না: {error} |
| 238 | ScreenMode | Browser extension connected | ব্রাউজার এক্সটেনশন যুক্ত |
| 239 | ScreenMode | Browser extension not connected: sites cannot be blocked (apps still can). | ব্রাউজার এক্সটেনশন যুক্ত নেই: সাইট বন্ধ করা যাবে না (অ্যাপ এখনো যাবে)। |
| 240 | ScreenMode | Set it up | চালু করুন |
| 241 | ScreenMode | Blocked sites | বন্ধ করা সাইট |
| 242 | ScreenMode | Productive sites (never blocked) | কাজের সাইট (কখনো বন্ধ হয় না) |
| 243 | ScreenMode | Blocked apps | বন্ধ করা অ্যাপ |
| 244 | ScreenMode | “{typed}” does not look like a web address or a program name. | “{typed}” কোনো ওয়েব ঠিকানা বা প্রোগ্রামের নাম বলে মনে হচ্ছে না। |
| 245 | ScreenMode | Apps can only be blocked, not marked productive. | অ্যাপ শুধু বন্ধ করা যায়, কাজের বলে চিহ্নিত করা যায় না। |
| 246 | ScreenMode | {site} is on your productive list. You can move it after the session. | {site} আপনার কাজের তালিকায় আছে। Session-এর পরে সরাতে পারবেন। |
| 247 | ScreenMode | Block sets | ব্লক সেট |
| 248 | ScreenMode | Edit sets | সেট বদলান |
| 249 | ScreenMode | Set name | সেটের নাম |
| 250 | ScreenMode | New set (copy of {name}) | নতুন সেট ({name}-এর কপি) |
| 251 | ScreenMode, Todo | Rename {name} | {name}-এর নাম বদলান |
| 252 | ScreenMode | Delete the set “{name}”? | “{name}” সেটটি মুছবেন? |
| 253 | ScreenMode, Todo | Delete {name} | {name} মুছুন |
| 254 | ScreenMode | Locked until the session ends: you can only add blocked sites and apps. | Session শেষ না হওয়া পর্যন্ত বন্ধ: শুধু বন্ধ করার সাইট ও অ্যাপ যোগ করতে পারবেন। |
| 255 | ScreenMode | Quick add | দ্রুত যোগ |
| 256 | ScreenMode | Remove | সরান |
| 257 | ScreenMode | Remove {name} | {name} সরান |
| 258 | ScreenMode | Add site or app, e.g. youtube.com/shorts or Discord | সাইট বা অ্যাপ যোগ করুন, যেমন youtube.com/shorts বা Discord |
| 259 | ScreenMode | Add to | যোগ করুন |
| 260 | ScreenMode | Block | বন্ধ করুন |
| 261 | ScreenMode | Always allow | সবসময় অনুমতি |
| 262 | ScreenMode | Add | যোগ করুন |
| 263 | ScreenMode | Browser extension | ব্রাউজার এক্সটেনশন |
| 264 | ScreenMode | How to install | কীভাবে ইনস্টল করবেন |
| 265 | ScreenMode | The extension lets Desk Watch see which site is open in Chrome or Edge, and send blocked sites to a “Back to work” page. It only talks to this computer. Firefox is not supported. | এক্সটেনশনটি দিয়ে Desk Watch দেখতে পায় Chrome বা Edge-এ কোন সাইট খোলা, আর বন্ধ করা সাইটকে “কাজে ফিরুন” পাতায় পাঠায়। এটি শুধু এই কম্পিউটারের সঙ্গে কথা বলে। Firefox চলে না। |
| 266 | ScreenMode | Install (once): | ইনস্টল (একবার): |
| 267 | ScreenMode | 1. Click Open extension folder. 2. In Chrome open chrome://extensions (Edge: edge://extensions), switch on Developer mode, click Load unpacked and choose that folder. 3. Desk Watch asks “Connect Chrome?”: click Allow. Done. | ১. “এক্সটেনশনের ফোল্ডার খুলুন”-এ ক্লিক করুন। ২. Chrome-এ chrome://extensions খুলুন (Edge: edge://extensions), Developer mode চালু করুন, Load unpacked-এ ক্লিক করে ওই ফোল্ডারটি বেছে নিন। ৩. Desk Watch জিজ্ঞেস করবে “Chrome যুক্ত করবেন?”: অনুমতি দিন-এ ক্লিক করুন। হয়ে গেল। |
| 268 | ScreenMode | Pairing code | জোড়ার কোড |
| 269 | ScreenMode | (only if the Allow question does not appear): type it in the extension’s options. | (শুধু যদি অনুমতির প্রশ্নটি না আসে): এক্সটেনশনের options-এ এটি লিখুন। |
| 270 | ScreenMode | For private windows, also switch on Allow in incognito in the extension’s details. | প্রাইভেট উইন্ডোর জন্য এক্সটেনশনের details-এ Allow in incognito-ও চালু করুন। |
| 271 | ScreenMode | Disconnect | বিচ্ছিন্ন করুন |
| 272 | ScreenMode | Pairing code (fallback): | জোড়ার কোড (বিকল্প): |
| 273 | ScreenMode | New code | নতুন কোড |
| 274 | ScreenMode | Block lists and sets are on the Study tab: tick Blocker mode. | ব্লক তালিকা ও সেট পড়ার পাতায় আছে: Blocker mode-এ টিক দিন। |
| 275 | ScreenMode | On the computer | কম্পিউটারে |
| 276 | ScreenMode | Connect {name}? | {name} যুক্ত করবেন? |
| 277 | ScreenMode | The Desk Watch blocker extension in {name} wants to connect, so Blocker mode can block sites there. | {name}-এর Desk Watch ব্লকার এক্সটেনশন যুক্ত হতে চায়, যাতে Blocker mode সেখানে সাইট বন্ধ করতে পারে। |
| 278 | ScreenMode | Only allow it if you just installed the extension yourself. | শুধু তখনই অনুমতি দিন যদি আপনি নিজেই এইমাত্র এক্সটেনশনটি ইনস্টল করে থাকেন। |
| 279 | ScreenMode | Allow | অনুমতি দিন |
| 280 | ScreenMode | Don’t allow | অনুমতি দেবেন না |
| 281 | ScreenMode | {n} blocked attempt | {n}বার বন্ধ করা হয়েছে |
| 282 | ScreenMode | {n} blocked attempts | {n}বার বন্ধ করা হয়েছে |
| 283 | Settings | Phone: evidence needed to count as phone (0-1) | ফোন: ফোন ধরার জন্য প্রয়োজনীয় প্রমাণ (০-১) |
| 284 | Settings | Phone: evidence below this counts as phone gone (0-1) | ফোন: এর নিচে প্রমাণ মানে ফোন সরানো হয়েছে (০-১) |
| 285 | Settings | Phone: seconds before the Phone alarm | ফোন: ফোন-অ্যালার্মের আগে কত সেকেন্ড |
| 286 | Settings | Phone: short dips forgiven (seconds) | ফোন: ছোট বিরতি উপেক্ষা (সেকেন্ড) |
| 287 | Settings | Phone: seconds without phone to clear it | ফোন: ফোন ছাড়া কত সেকেন্ড পরে মুছবে |
| 288 | Settings | Phone: also use the zoomed hand view (catches more phones) | ফোন: হাতের বড় করা ছবিও ব্যবহার করুন (বেশি ফোন ধরে) |
| 289 | Settings | Phone: ignore objects that look like a calculator, pen or book | ফোন: ক্যালকুলেটর, কলম বা বইয়ের মতো জিনিস উপেক্ষা করুন |
| 290 | Settings | Phone: confidence needed to name an object (0-1) | ফোন: কোনো জিনিস চিনতে প্রয়োজনীয় নিশ্চয়তা (০-১) |
| 291 | Settings | Phone: ignore phone boxes in a hand the object model is this sure is empty (0 = off) | ফোন: জিনিস-চেনার মডেল যে হাতকে এতটা নিশ্চিতভাবে খালি বলে, সেখানে ফোনের ঘর উপেক্ষা করুন (০ = বন্ধ) |
| 292 | Settings | Phone: a raised, still hand adds evidence | ফোন: ওপরে তোলা স্থির হাত প্রমাণ বাড়ায় |
| 293 | Settings | Phone: hand view size (× hand size) | ফোন: হাতের ছবির মাপ (× হাতের মাপ) |
| 294 | Settings | Raised hand: minimum phone evidence | তোলা হাত: সবচেয়ে কম ফোনের প্রমাণ |
| 295 | Settings | Raised hand: seconds held still | তোলা হাত: কত সেকেন্ড স্থির |
| 296 | Settings | Raised hand: "still" means moving less than (share of width) | তোলা হাত: "স্থির" মানে এর চেয়ে কম নড়া (চওড়ার অংশ) |
| 297 | Settings | Phone call: seconds before the alarm | ফোন কল: অ্যালার্মের আগে কত সেকেন্ড |
| 298 | Settings | Phone call: seconds to clear it | ফোন কল: কত সেকেন্ড পরে মুছবে |
| 299 | Settings | Phone call: finger distance to ear (face widths) | ফোন কল: আঙুল থেকে কানের দূরত্ব (মুখের চওড়ায়) |
| 300 | Settings | Phone call: phone distance to ear (face widths) | ফোন কল: ফোন থেকে কানের দূরত্ব (মুখের চওড়ায়) |
| 301 | Settings | Phone call: hand must be this far out past the ear (face widths) | ফোন কল: হাত কানের এতটা বাইরে থাকতে হবে (মুখের চওড়ায়) |
| 302 | Settings | Phone call: phone evidence needed at the hand (0 = hand at ear is enough) | ফোন কল: হাতে প্রয়োজনীয় ফোনের প্রমাণ (০ = কানে হাতই যথেষ্ট) |
| 303 | Settings | Looking down: seconds before the alarm | নিচে তাকানো: অ্যালার্মের আগে কত সেকেন্ড |
| 304 | Settings | Looking down: degrees beyond your reading angle | নিচে তাকানো: আপনার পড়ার কোণের চেয়ে কত ডিগ্রি বেশি |
| 305 | Settings | Looking down: angle used until you calibrate (degrees) | নিচে তাকানো: calibrate না করা পর্যন্ত ব্যবহৃত কোণ (ডিগ্রি) |
| 306 | Settings | Away: seconds before the alarm | অনুপস্থিত: অ্যালার্মের আগে কত সেকেন্ড |
| 307 | Settings | Looking away: seconds before the alarm | অন্য দিকে তাকানো: অ্যালার্মের আগে কত সেকেন্ড |
| 308 | Settings | Looking away: eyes sideways (0-1) | অন্য দিকে তাকানো: চোখ পাশে (০-১) |
| 309 | Settings | Looking away: or head turned more than (degrees) | অন্য দিকে তাকানো: অথবা মাথা এর বেশি ঘোরানো (ডিগ্রি) |
| 310 | Settings | Speaking: mouth movement (0-1) | কথা বলা: মুখের নড়াচড়া (০-১) |
| 311 | Settings | Reading (before calibration): eyes down (0-1) | পড়া (Calibration-এর আগে): চোখ নিচে (০-১) |
| 312 | Settings | Writing (before calibration): visible hand movement | লেখা (Calibration-এর আগে): হাতের দেখা যাওয়া নড়াচড়া |
| 313 | Settings | Phone in lap: eyes-level rule (0 = off; try 0.15) | কোলে ফোন: চোখ-সমতলের নিয়ম (০ = বন্ধ; ০.১৫ চেষ্টা করুন) |
| 314 | Settings | Phone in lap: degrees past your reading angle (can be negative) | কোলে ফোন: পড়ার কোণের চেয়ে কত ডিগ্রি বেশি (ঋণাত্মক হতে পারে) |
| 315 | Settings | Person: confidence needed to count you as present (0-1) | মানুষ: আপনাকে উপস্থিত ধরতে প্রয়োজনীয় নিশ্চয়তা (০-১) |
| 316 | Settings | Smoothing window (milliseconds) | মসৃণ করার সময় (মিলিসেকেন্ড) |
| 317 | Settings | Checks per second | প্রতি সেকেন্ডে কতবার দেখা |
| 318 | Settings | Same as Windows | Windows-এর মতো |
| 319 | Settings | Light | Light |
| 320 | Settings | Dark | Dark |
| 321 | Settings | Auto | স্বয়ংক্রিয় |
| 322 | Settings, power | Full | পূর্ণ |
| 323 | Settings | Low power | কম শক্তি |
| 324 | Settings | Default camera | ডিফল্ট ক্যামেরা |
| 325 | Settings | Saved to {path} | {path}-এ সংরক্ষিত |
| 326 | Settings | Importing REPLACES all your sessions and settings with the ones in the file.<br><br>Export your current data first if you may want it back. Continue? | আমদানি করলে আপনার সব Session ও সেটিংস ফাইলের গুলো দিয়ে বদলে যাবে।<br><br>পরে ফেরত চাইতে পারেন মনে হলে আগে বর্তমান ডেটা রপ্তানি করুন। চালিয়ে যাবেন? |
| 327 | Settings | Imported. | আমদানি হয়েছে। |
| 328 | Settings | Delete ALL your sessions, history and settings? This cannot be undone. | আপনার সব Session, ইতিহাস ও সেটিংস মুছবেন? এটি আর ফেরানো যাবে না। |
| 329 | Settings | Are you sure? Everything in the database will be gone. | আপনি কি নিশ্চিত? ডেটাবেসের সবকিছু চলে যাবে। |
| 330 | Settings | All data deleted. | সব ডেটা মোছা হয়েছে। |
| 331 | History, Settings, setup | Sessions | Session |
| 332 | Settings | Default length (focused minutes) | স্বাভাবিক দৈর্ঘ্য (মনোযোগী মিনিট) |
| 333 | Settings | Break length (minutes) | Break-এর দৈর্ঘ্য (মিনিট) |
| 334 | Settings | Strict mode | Strict mode |
| 335 | Settings | ending a session early needs a typed sentence | আগে Session শেষ করতে একটি বাক্য লিখতে হয় |
| 336 | Settings | Routine reminders | রুটিনের রিমাইন্ডার |
| 337 | Settings | when a block from your weekly plan starts (not during a session) | আপনার সাপ্তাহিক পরিকল্পনার কোনো ব্লক শুরু হলে (Session চলার সময় নয়) |
| 338 | Settings, focus | Pomodoro | Pomodoro |
| 339 | Settings | Used by Focus mode and the to-do list: a pomodoro is this many minutes of camera-checked focused time. | Focus mode ও কাজের তালিকায় ব্যবহৃত: ক্যামেরায় যাচাই করা এত মিনিট মনোযোগী সময় মানে একটি Pomodoro। |
| 340 | Settings | Pomodoro length (minutes) | Pomodoro-র দৈর্ঘ্য (মিনিট) |
| 341 | Settings | Break (minutes) | Break (মিনিট) |
| 342 | Settings | Long break (minutes) | Long break (মিনিট) |
| 343 | Settings | Long break after (pomodoros) | Long break কয়টির পরে (Pomodoro) |
| 344 | Settings | Daily goal (pomodoros) | দৈনিক লক্ষ্য (Pomodoro) |
| 345 | Settings | Start the next pomodoro by itself | পরের Pomodoro নিজে থেকে শুরু হোক |
| 346 | Settings | when a break ends; otherwise press Start next pomodoro | Break শেষ হলে; নইলে “পরের Pomodoro শুরু করুন” চাপুন |
| 347 | Settings | Alarm | অ্যালার্ম |
| 348 | Settings | Alarm sound | অ্যালার্মের শব্দ |
| 349 | Settings | Chosen | বেছে নেওয়া |
| 350 | Settings | Click to hear | শুনতে ক্লিক করুন |
| 351 | Settings | Volume {pct}% | ভলিউম {pct}% |
| 352 | Settings | Test sound | শব্দ পরীক্ষা করুন |
| 353 | Settings | App | অ্যাপ |
| 354 | Settings | Bangla uses Bangla digits and dates. The Debug tab stays in English. | বাংলায় সংখ্যা ও তারিখ বাংলায় দেখায়। Debug ট্যাব ইংরেজিতেই থাকে। |
| 355 | Settings | Week starts on | সপ্তাহ শুরু হয় |
| 356 | Settings | Used by the Planner’s week and History’s “This week”. | পরিকল্পনার সপ্তাহ আর ইতিহাসের “এই সপ্তাহ”-এ ব্যবহৃত। |
| 357 | Settings | Theme | থিম |
| 358 | Settings | Start Desk Watch when I log in to Windows | Windows-এ লগইন করলে Desk Watch চালু হোক |
| 359 | Settings | Your data | আপনার ডেটা |
| 360 | Settings | Everything is stored only on this computer, in one file: | সবকিছু শুধু এই কম্পিউটারে একটি ফাইলে রাখা আছে: |
| 361 | Settings | , plus weekly backups of it. | , সঙ্গে এর সাপ্তাহিক ব্যাকআপ। |
| 362 | Settings | Open folder | ফোল্ডার খুলুন |
| 363 | Settings | Export sessions (CSV) | Session রপ্তানি করুন (CSV) |
| 364 | Settings | Export everything (JSON) | সব রপ্তানি করুন (JSON) |
| 365 | Settings | Import JSON… | JSON আমদানি করুন… |
| 366 | Settings | End your session to import, restore or delete data. | ডেটা আমদানি, পুনরুদ্ধার বা মুছতে Session শেষ করুন। |
| 367 | Settings, setup | Advanced | উন্নত |
| 368 | Settings | Show Debug tab | Debug ট্যাব দেখান |
| 369 | Settings | for recording test clips and checking detection | টেস্ট ক্লিপ রেকর্ড আর শনাক্তকরণ যাচাইয়ের জন্য |
| 370 | Settings | Performance | গতি |
| 371 | Settings | Auto measures your computer’s speed after start and uses a lighter mode only if it is too slow. On the test clips the smaller phone model was as good as the full one, and checking 2 times a second instead of 5 caught the same phones, with the alarm about 1 second later. | স্বয়ংক্রিয় মোড চালু হওয়ার পরে আপনার কম্পিউটারের গতি মাপে, আর খুব ধীর হলে তবেই হালকা মোড ব্যবহার করে। টেস্ট ক্লিপে ছোট ফোন-মডেলটি পূর্ণ মডেলের মতোই ভালো ছিল, আর সেকেন্ডে ৫ বারের বদলে ২ বার দেখলেও একই ফোন ধরা পড়েছে, অ্যালার্ম প্রায় ১ সেকেন্ড দেরিতে বেজেছে। |
| 372 | Settings | In use: {level} | চালু আছে: {level} |
| 373 | Settings | measured {phone} phone checks and {hands} hand checks a second | মাপা হয়েছে সেকেন্ডে {phone}বার ফোন ও {hands}বার হাত দেখা |
| 374 | Settings | ({min} needed) | ({min} দরকার) |
| 375 | Settings | measuring… | মাপা হচ্ছে… |
| 376 | Settings | Browser connection | ব্রাউজার সংযোগ |
| 377 | Settings | Workstations | পড়ার জায়গা |
| 378 | Settings | Detection thresholds | শনাক্তকরণের সীমা |
| 379 | Settings | The defaults were tuned on test clips. Change them only if detection is wrong for you. | স্বাভাবিক মানগুলো টেস্ট ক্লিপে ঠিক করা। শনাক্তকরণ আপনার জন্য ভুল হলে তবেই বদলান। |
| 380 | Settings | Reset thresholds to defaults | সীমাগুলো আগের মানে ফেরান |
| 381 | Settings | Delete all my data | আমার সব ডেটা মুছুন |
| 382 | Settings | Deletes every session, task, block list, setting and backup. Test clips from the Debug tab are kept in their own folder. | সব Session, কাজ, ব্লক তালিকা, সেটিংস ও ব্যাকআপ মুছে দেয়। Debug ট্যাবের টেস্ট ক্লিপ নিজেদের ফোল্ডারে থেকে যায়। |
| 383 | Settings | {kb} KB | {kb} কেবি |
| 384 | Settings | {mb} MB | {mb} এমবি |
| 385 | Settings | Backup made. | ব্যাকআপ তৈরি হয়েছে। |
| 386 | Settings | Restore the backup from {when}?<br><br>Your current data is backed up first, then replaced by this backup. Anything added after that backup will only be in the “before restore” backup. | {when}-এর ব্যাকআপ পুনরুদ্ধার করবেন?<br><br>আগে আপনার বর্তমান ডেটার ব্যাকআপ নেওয়া হবে, তারপর এই ব্যাকআপ দিয়ে বদলানো হবে। ওই ব্যাকআপের পরে যা যোগ হয়েছে তা শুধু “পুনরুদ্ধারের আগে” ব্যাকআপে থাকবে। |
| 387 | Settings | Backups | ব্যাকআপ |
| 388 | Settings | A copy of your data is saved once a week; the newest 4 are kept. | সপ্তাহে একবার আপনার ডেটার একটি কপি রাখা হয়; সবচেয়ে নতুন ৪টি থাকে। |
| 389 | Settings | Last backup: {when}. | শেষ ব্যাকআপ: {when}। |
| 390 | Settings | No backup yet. | এখনো কোনো ব্যাকআপ নেই। |
| 391 | Settings | Back up now | এখনই ব্যাকআপ নিন |
| 392 | Settings | Open backups folder | ব্যাকআপের ফোল্ডার খুলুন |
| 393 | Settings | before restore | পুনরুদ্ধারের আগে |
| 394 | Settings | Restore… | পুনরুদ্ধার… |
| 395 | Study | I am choosing to stop before my goal and I accept that. | আমি লক্ষ্যের আগেই থামছি এবং এটা মেনে নিচ্ছি। |
| 396 | Study | Close it and get back to work. | এটা বন্ধ করে কাজে ফিরুন। |
| 397 | Study, useSession | Time to get back to work. | এবার কাজে ফেরার সময়। |
| 398 | Study | Come back to your desk. | টেবিলে ফিরে আসুন। |
| 399 | Study | Put the phone down. | ফোন নামিয়ে রাখুন। |
| 400 | Study | Eyes back on your work. | চোখ আবার কাজে ফেরান। |
| 401 | Study | Saving… | সংরক্ষণ হচ্ছে… |
| 402 | Study | Goal reached | লক্ষ্য পূরণ হয়েছে |
| 403 | Study | Start a new session | নতুন Session শুরু করুন |
| 404 | Study | End now? You still have {time} to your goal. | এখনই শেষ করবেন? লক্ষ্যে পৌঁছাতে এখনো {time} বাকি। |
| 405 | Study | Or in English: | অথবা ইংরেজিতে: |
| 406 | Study | Keep studying | পড়া চালিয়ে যান |
| 407 | Focus, Study | Back to work | কাজে ফিরুন |
| 408 | Study | An estimate from the camera. Writing, reading, speaking and idle all count as study time. | ক্যামেরা থেকে আন্দাজ। লেখা, পড়া, কথা বলা ও চুপ করে বসে থাকা সবই পড়ার সময় হিসেবে গোনা হয়। |
| 409 | Study | estimate | আন্দাজ |
| 410 | Focus, Study | Progress to your goal | লক্ষ্যের দিকে অগ্রগতি |
| 411 | Study | {left} to go · goal {min} min | আর {left} · লক্ষ্য {min} মিনিট |
| 412 | Study | camera off | ক্যামেরা বন্ধ |
| 413 | Study | Browser extension not connected: sites can’t be blocked. | ব্রাউজার এক্সটেনশন যুক্ত নেই: সাইট বন্ধ করা যাবে না। |
| 414 | Study | Full screen | পুরো স্ক্রিন |
| 415 | Study | Break {min} min | {min} মিনিট Break |
| 416 | Study | For the washroom or something urgent: no time limit, no alarm | বাথরুম বা জরুরি কিছুর জন্য: সময়ের সীমা নেই, অ্যালার্ম নেই |
| 417 | Study | Block another site or app | আরেকটি সাইট বা অ্যাপ বন্ধ করুন |
| 418 | Study | Clock and alarms are stopped. | ঘড়ি ও অ্যালার্ম থেমে আছে। |
| 419 | Study | {place} calibrated | {place} calibrate করা |
| 420 | Study, Workstations | calibrated | Calibrate করা |
| 421 | Study | not calibrated yet | এখনো calibrate করা হয়নি |
| 422 | Study | Ready · timer only | তৈরি · শুধু টাইমার |
| 423 | Study | Ready | তৈরি |
| 424 | Study | camera sees you | ক্যামেরা আপনাকে দেখছে |
| 425 | Study | camera can’t see your face | ক্যামেরা আপনার মুখ দেখতে পাচ্ছে না |
| 426 | Study, setup | Session length | Session-এর দৈর্ঘ্য |
| 427 | Study | Length | দৈর্ঘ্য |
| 428 | Study | Custom | নিজের মতো |
| 429 | Study, todo | {m} min | {m} মিনিট |
| 430 | Study | Minutes | মিনিট |
| 431 | Study | On | চালু |
| 432 | Study, noise | Off | বন্ধ |
| 433 | Study | Alarm for phone, leaving or looking away | ফোন, উঠে যাওয়া বা অন্য দিকে তাকালে অ্যালার্ম |
| 434 | Study | Blocks the sites and apps on your list | আপনার তালিকার সাইট ও অ্যাপ বন্ধ রাখে |
| 435 | Focus, Study, Todo, setup | Start | শুরু করুন |
| 436 | Study | Full screen, with a pomodoro, countdown or count-up timer (Timer in Focus mode) | পুরো স্ক্রিনে, Pomodoro, Countdown বা Count-up টাইমারসহ (Focus mode-এর টাইমার) |
| 437 | Study, setup | More options | আরও বিকল্প |
| 438 | Study | Task: {task} | কাজ: {task} |
| 439 | Study | none | নেই |
| 440 | Study | Place and calibration | জায়গা ও Calibration |
| 441 | Study | Block lists | ব্লক তালিকা |
| 442 | Study | Hide camera | ক্যামেরা লুকান |
| 443 | Study | Show camera | ক্যামেরা দেখান |
| 444 | Study | No tasks yet. | এখনো কোনো কাজ নেই। |
| 445 | Study | Add one in the Planner | পরিকল্পনায় একটি যোগ করুন |
| 446 | Study | study block | পড়ার ব্লক |
| 447 | Study | Next: {time} {name} | পরের: {time} {name} |
| 448 | Study | No more blocks today | আজ আর কোনো ব্লক নেই |
| 449 | Study | Mark this task as done? | এই কাজটি সম্পন্ন বলে চিহ্নিত করবেন? |
| 450 | Study | Yes | হ্যাঁ |
| 451 | Study | Not yet | এখনো না |
| 452 | Study | {n} task due today | আজ {n}টি কাজ জমা |
| 453 | Study | {n} tasks due today | আজ {n}টি কাজ জমা |
| 454 | Todo | High | বেশি |
| 455 | Todo | Normal | সাধারণ |
| 456 | Todo | Low | কম |
| 457 | Todo | Does not repeat | ফিরে আসে না |
| 458 | Todo | Every day | প্রতিদিন |
| 459 | Todo | Every weekday (Mon–Fri) | প্রতি কর্মদিবস (সোম–শুক্র) |
| 460 | Todo | Every week | প্রতি সপ্তাহ |
| 461 | Todo | Done: {title}. | সম্পন্ন: {title}। |
| 462 | Todo | The next one is planned. | পরেরটি পরিকল্পনায় যোগ হয়েছে। |
| 463 | Todo | Deleted: {title} | মোছা হয়েছে: {title} |
| 464 | History, Planner, Todo | Subject | বিষয় |
| 465 | Todo | Estimated time | আনুমানিক সময় |
| 466 | Todo | Tasks left | বাকি কাজ |
| 467 | Todo | Focused today | আজকের মনোযোগ |
| 468 | Todo | Completed today | আজ সম্পন্ন |
| 469 | Todo | Daily goal | দৈনিক লক্ষ্য |
| 470 | Todo | Pomodoros of focused time today, of your goal (Settings → Pomodoro) | আজকের মনোযোগী সময়ের Pomodoro, আপনার লক্ষ্যের মধ্যে (সেটিংস → Pomodoro) |
| 471 | Todo | {list} tasks | {list}-এর কাজ |
| 472 | Todo | Move {title} up | {title} ওপরে সরান |
| 473 | Todo | Move {title} down | {title} নিচে সরান |
| 474 | Todo | Keys: N new task · Ctrl+K search · on a task: Enter open, Space complete, Delete | কী: N নতুন কাজ · Ctrl+K খুঁজুন · কোনো কাজে: Enter খুলুন, Space সম্পন্ন, Delete মুছুন |
| 475 | Routines, Todo | Undo | ফিরিয়ে নিন |
| 476 | Todo, todo | Tomorrow | আগামীকাল |
| 477 | Todo | repeats | ফিরে আসে |
| 478 | Todo | {done}/{all} steps | {done}/{all} ধাপ |
| 479 | Todo | Overdue | সময় পেরিয়ে গেছে |
| 480 | Todo | Type a task above and press Enter. Start it to study for it with the camera on; its minutes add up here. | ওপরে একটি কাজ লিখে Enter চাপুন। ক্যামেরা চালু রেখে এর জন্য পড়তে “শুরু করুন” চাপুন; এর মিনিট এখানে যোগ হবে। |
| 481 | Todo | Nothing completed yet | এখনো কিছু সম্পন্ন হয়নি |
| 482 | Todo | Tick a task and it moves here. | কোনো কাজে টিক দিলে সেটি এখানে চলে আসে। |
| 483 | Todo | Nothing due today | আজ কিছু জমা নেই |
| 484 | Todo | Tasks due today or earlier show here. | আজ বা আগে জমার কাজগুলো এখানে দেখা যায়। |
| 485 | Todo | Nothing due tomorrow | আগামীকাল কিছু জমা নেই |
| 486 | Todo | Type “tomorrow” in a task, or add it here. | কাজের মধ্যে “আগামীকাল” লিখুন, বা এখানে যোগ করুন। |
| 487 | Todo | Nothing due this week | এই সপ্তাহে কিছু জমা নেই |
| 488 | Todo | Tasks with a due date this week show here. | এই সপ্তাহে জমার তারিখের কাজগুলো এখানে দেখা যায়। |
| 489 | Todo | No tasks with a due date | জমার তারিখসহ কোনো কাজ নেই |
| 490 | Todo | Give a task a due date and it shows here. | কোনো কাজে জমার তারিখ দিলে সেটি এখানে দেখা যাবে। |
| 491 | Todo | No open tasks here | এখানে কোনো বাকি কাজ নেই |
| 492 | Todo | Add one above. | ওপরে একটি যোগ করুন। |
| 493 | Todo, setup | Lists | তালিকা |
| 494 | Routines, Todo | Subjects | বিষয় |
| 495 | Todo | New name for {name} | {name}-এর নতুন নাম |
| 496 | Todo | Rename | নাম বদলান |
| 497 | Todo | Delete the subject “{name}”? Its tasks stay, without a subject. | “{name}” বিষয়টি মুছবেন? এর কাজগুলো থাকবে, বিষয় ছাড়া। |
| 498 | Todo | New subject | নতুন বিষয় |
| 499 | Todo | + Subject | + বিষয় |
| 500 | Todo | Subject name | বিষয়ের নাম |
| 501 | Todo | New task | নতুন কাজ |
| 502 | Todo | Add a task, e.g. “Essay #English friday ~3” | একটি কাজ যোগ করুন, যেমন “রচনা #বাংলা শুক্রবার ~৩” |
| 503 | Todo | Keep “{word}” as text | “{word}” লেখা হিসেবেই রাখুন |
| 504 | Todo | Estimate | আনুমানিক |
| 505 | Todo | Enter to add | যোগ করতে Enter |
| 506 | Todo | Enter to add (no due date) | যোগ করতে Enter (জমার তারিখ নেই) |
| 507 | Todo | Estimated pomodoros | আনুমানিক Pomodoro |
| 508 | Todo | Task details | কাজের বিস্তারিত |
| 509 | Todo | Title | শিরোনাম |
| 510 | Todo | Notes | নোট |
| 511 | Todo | Steps | ধাপ |
| 512 | Todo | Remove step {title} | {title} ধাপটি সরান |
| 513 | Todo | Add a step | একটি ধাপ যোগ করুন |
| 514 | Todo | Add a step and press Enter | একটি ধাপ লিখে Enter চাপুন |
| 515 | Todo | Due date | জমার তারিখ |
| 516 | Todo | Repeat | ফিরে আসা |
| 517 | Todo | None | নেই |
| 518 | Todo | Priority | গুরুত্ব |
| 519 | Todo | Delete task | কাজ মুছুন |
| 520 | Todo | Search tasks | কাজ খুঁজুন |
| 521 | Todo | Search titles, notes and steps | শিরোনাম, নোট ও ধাপে খুঁজুন |
| 522 | Todo | Nothing found. | কিছু পাওয়া যায়নি। |
| 523 | Report, Todo, todo | {n} pomodoro | {n}টি Pomodoro |
| 524 | Report, Todo, todo | {n} pomodoros | {n}টি Pomodoro |
| 525 | Todo | Focused on this task: {time} ({n} pomodoro of {min} min), camera-checked | এই কাজে মনোযোগ: {time} ({min} মিনিটের {n}টি Pomodoro), ক্যামেরায় যাচাই করা |
| 526 | Todo | Focused on this task: {time} ({n} pomodoros of {min} min), camera-checked | এই কাজে মনোযোগ: {time} ({min} মিনিটের {n}টি Pomodoro), ক্যামেরায় যাচাই করা |
| 527 | Tour | {k} of {all} | {k} / {all} |
| 528 | Tour | Skip tour | পরিচিতি বাদ দিন |
| 529 | Workstations | Same desk, same chair and the camera where it was? Your saved calibration still fits, no need to calibrate again. Moved the laptop or camera, changed chair, or you sit differently? Calibrate again and update the workstation. | একই টেবিল, একই চেয়ার আর ক্যামেরা আগের জায়গায়? তাহলে সংরক্ষিত Calibrationই চলবে, আবার calibrate করার দরকার নেই। ল্যাপটপ বা ক্যামেরা সরিয়েছেন, চেয়ার বদলেছেন, বা অন্যভাবে বসছেন? আবার calibrate করে জায়গাটি হালনাগাদ করুন। |
| 530 | Workstations | + New place | + নতুন জায়গা |
| 531 | Workstations | Workstation | পড়ার জায়গা |
| 532 | Workstations | Not saved (this time only) | সংরক্ষিত নয় (শুধু এবারের জন্য) |
| 533 | Workstations | Not calibrated | Calibrate করা হয়নি |
| 534 | Workstations | + New place… | + নতুন জায়গা… |
| 535 | Workstations | Delete the workstation “{name}”? | “{name}” জায়গাটি মুছবেন? |
| 536 | Workstations | Delete | মুছুন |
| 537 | Workstations | Not saved: | সংরক্ষিত নয়: |
| 538 | Workstations | Name, e.g. Desk at home | নাম, যেমন বাড়ির টেবিল |
| 539 | Workstations | Save as workstation | পড়ার জায়গা হিসেবে সংরক্ষণ করুন |
| 540 | Workstations | No saved workstations yet. Calibrate on the Study tab (Place and calibration), then save it with a name. | এখনো কোনো সংরক্ষিত জায়গা নেই। পড়ার পাতায় (জায়গা ও Calibration) calibrate করুন, তারপর একটা নাম দিয়ে সংরক্ষণ করুন। |
| 541 | Workstations | reading angle {angle}° · activities {state} | পড়ার কোণ {angle}° · কাজের ধরন {state} |
| 542 | Workstations | not calibrated | Calibrate করা হয়নি |
| 543 | Workstations | in use | ব্যবহৃত হচ্ছে |
| 544 | Workstations | Use | ব্যবহার করুন |
| 545 | History, accounting | Focused | মনোযোগী |
| 546 | accounting | Writing | লেখা |
| 547 | accounting | Reading | পড়া |
| 548 | accounting | Speaking | কথা বলা |
| 549 | accounting | Idle | চুপচাপ |
| 550 | accounting | Looking away | অন্য দিকে তাকানো |
| 551 | accounting | Phone | ফোন |
| 552 | accounting | Phone call | ফোন কল |
| 553 | accounting | Looking down | নিচে তাকানো |
| 554 | accounting | Away | অনুপস্থিত |
| 555 | accounting | Blocked app: {name} | বন্ধ করা অ্যাপ: {name} |
| 556 | accounting | phone | ফোন |
| 557 | accounting | {n} phone | {n} ফোন |
| 558 | accounting | looking down | নিচে তাকানো |
| 559 | accounting | {n} looking down | {n} নিচে তাকানো |
| 560 | accounting | left | উঠে যাওয়া |
| 561 | accounting | {n} left | {n} উঠে যাওয়া |
| 562 | accounting | looking away | অন্য দিকে তাকানো |
| 563 | accounting | {n} looking away | {n} অন্য দিকে তাকানো |
| 564 | accounting | blocked site | বন্ধ করা সাইট |
| 565 | accounting | {n} blocked site | {n} বন্ধ করা সাইট |
| 566 | accounting | {n} blocked sites | {n} বন্ধ করা সাইট |
| 567 | accounting | blocked app | বন্ধ করা অ্যাপ |
| 568 | accounting | {n} blocked app | {n} বন্ধ করা অ্যাপ |
| 569 | accounting | {n} blocked apps | {n} বন্ধ করা অ্যাপ |
| 570 | accounting | {n} of {planned} minutes focused. | {planned} মিনিটের মধ্যে {n} মিনিট মনোযোগ। |
| 571 | accounting | The camera was off, so distractions were not checked. | ক্যামেরা বন্ধ ছিল, তাই মনোযোগ নষ্ট হওয়া দেখা হয়নি। |
| 572 | accounting | Your phone cost you {amount}. | ফোনের কারণে {amount} নষ্ট হয়েছে। |
| 573 | accounting | Looking down cost you {amount}. | নিচে তাকানোর কারণে {amount} নষ্ট হয়েছে। |
| 574 | accounting | Leaving the desk cost you {amount}. | টেবিল ছেড়ে যাওয়ায় {amount} নষ্ট হয়েছে। |
| 575 | accounting | Looking away cost you {amount}. | অন্য দিকে তাকানোর কারণে {amount} নষ্ট হয়েছে। |
| 576 | accounting | Sleepiness cost you {amount}. | ঘুম ঘুম ভাবের কারণে {amount} নষ্ট হয়েছে। |
| 577 | accounting | Sleepy | ঘুম ঘুম ভাব |
| 578 | accounting | sleepy | ঘুম ঘুম ভাব |
| 579 | accounting | {n} sleepy | {n} ঘুম ঘুম ভাব |
| 580 | accounting | Wake up | জেগে উঠুন |
| 581 | Study | Sit up and open your eyes. If you are very tired, take a break. | সোজা হয়ে বসুন আর চোখ খুলুন। খুব ক্লান্ত লাগলে Break নিন। |
| 582 | Study | You look sleepy. Take a short break? | আপনাকে ঘুম ঘুম লাগছে। একটু Break নেবেন? |
| 583 | Settings | Sleepy alarm | ঘুমের অ্যালার্ম |
| 584 | Settings | eyes closed {eyes} s, or head down on the desk {head} s (times in Advanced) | চোখ {eyes} সেকেন্ড বন্ধ, বা টেবিলে মাথা রেখে {head} সেকেন্ড (সময় উন্নত অংশে) |
| 585 | Settings | Sleepy: eyes closed, seconds before the alarm | ঘুম ঘুম ভাব: চোখ বন্ধ, অ্যালার্মের আগে কত সেকেন্ড |
| 586 | Settings | Sleepy: head down on the desk, seconds before the alarm | ঘুম ঘুম ভাব: টেবিলে মাথা রাখা, অ্যালার্মের আগে কত সেকেন্ড |
| 587 | Settings | Sleepy: eyes count as closed above (0-1) | ঘুম ঘুম ভাব: এর বেশি হলে চোখ বন্ধ ধরা হবে (০-১) |
| 588 | accounting | No distractions seen. | মনোযোগ নষ্ট হতে দেখা যায়নি। |
| 589 | accounting | No phone pickups this week or last week. | এই সপ্তাহে বা গত সপ্তাহে ফোন তোলা হয়নি। |
| 590 | accounting | {now} this week, the same as last week. | এই সপ্তাহে {now}বার, গত সপ্তাহের সমান। |
| 591 | accounting | {now} this week, {diff} fewer than last week. | এই সপ্তাহে {now}বার, গত সপ্তাহের চেয়ে {diff}বার কম। |
| 592 | accounting | {now} this week, {diff} more than last week. | এই সপ্তাহে {now}বার, গত সপ্তাহের চেয়ে {diff}বার বেশি। |
| 593 | accounting | {n} second | {n} সেকেন্ড |
| 594 | accounting | {n} seconds | {n} সেকেন্ড |
| 595 | accounting | {n} minute | {n} মিনিট |
| 596 | accounting | {n} minutes | {n} মিনিট |
| 597 | noise | White | White noise |
| 598 | noise | Pink | Pink noise |
| 599 | noise | Brown | Brown noise |
| 600 | sounds | Beeping | বিপ বিপ |
| 601 | sounds | Siren | সাইরেন |
| 602 | sounds | Loud chime | জোরে ঘণ্টা |
| 603 | Settings | Block website notifications | ওয়েবসাইটের notification বন্ধ রাখুন |
| 604 | Settings | in Chrome or Edge while a session runs; back after it ends, a break or a pause (needs the browser extension) | Session চলার সময় Chrome বা Edge-এ; Session শেষ হলে, Break বা বিরতিতে আবার চালু হয় (browser extension লাগবে) |
| 605 | Settings | Remind me to turn on Do not disturb | Do not disturb চালু করতে মনে করিয়ে দিন |
| 606 | Settings | Windows notifications: Desk Watch cannot switch them off itself, so a bar opens the Windows setting for you | Windows notification: Desk Watch নিজে এগুলো বন্ধ করতে পারে না, তাই একটি বার আপনার জন্য Windows-এর সেটিং খুলে দেয় |
| 607 | Study | Windows notifications can still pop up. Turn on Do not disturb? | Windows notification এখনও আসতে পারে। Do not disturb চালু করবেন? |
| 608 | Study | Open Windows setting | Windows সেটিং খুলুন |
| 609 | Study | Don’t remind me | আর মনে করাবেন না |
| 610 | useSession | Goal reached! | লক্ষ্য পূরণ হয়েছে! |
| 611 | useSession | You studied {min} focused minutes. | আপনি {min} মিনিট মনোযোগ দিয়ে পড়েছেন। |
| 612 | useSession | Back to your studies! | পড়ায় ফিরুন! |
| 613 | useSession | Desk Watch: browser extension not connected | Desk Watch: ব্রাউজার এক্সটেনশন যুক্ত নেই |
| 614 | useSession | Sites cannot be blocked in this browser. Set up the extension in Settings → Blocker mode. | এই ব্রাউজারে সাইট বন্ধ করা যাবে না। সেটিংস → Blocker mode-এ এক্সটেনশন চালু করুন। |
| 615 | camera | Your face is visible. | আপনার মুখ দেখা যাচ্ছে। |
| 616 | camera | Your face is often not found. Point the camera at your face. | আপনার মুখ প্রায়ই পাওয়া যাচ্ছে না। ক্যামেরা মুখের দিকে ঘোরান। |
| 617 | camera | You are far from the camera. Move it closer, or sit closer. | আপনি ক্যামেরা থেকে দূরে আছেন। ক্যামেরা কাছে আনুন, বা কাছে বসুন। |
| 618 | camera | The camera is too close. Move it back so your hands and desk fit in the picture. | ক্যামেরা খুব কাছে। পেছনে সরান যাতে হাত আর টেবিল ছবিতে আসে। |
| 619 | camera | Distance is good. | দূরত্ব ঠিক আছে। |
| 620 | camera | Your face is in the lower half of the picture. Tilt the camera down a little less, or raise it, so your face is in the top half and the desk in the bottom half. | আপনার মুখ ছবির নিচের অর্ধেকে। ক্যামেরা একটু কম নিচু করুন বা উঁচু করুন, যাতে মুখ ওপরের অর্ধেকে আর টেবিল নিচের অর্ধেকে থাকে। |
| 621 | camera | Your face is at the very top edge. Tilt the camera up a little. | আপনার মুখ একদম ওপরের কিনারায়। ক্যামেরা একটু ওপরে কাত করুন। |
| 622 | camera | Face is in the top half, desk below: good. | মুখ ওপরের অর্ধেকে, টেবিল নিচে: ঠিক আছে। |
| 623 | camera | Your hands on the desk are visible. | টেবিলে আপনার হাত দেখা যাচ্ছে। |
| 624 | camera | Your hands on the desk are not visible. Tilt the camera down or move it further back. Phone and writing detection need your hands in view. | টেবিলে আপনার হাত দেখা যাচ্ছে না। ক্যামেরা নিচে কাত করুন বা আরও পেছনে সরান। ফোন আর লেখা শনাক্ত করতে হাত দেখা দরকার। |
| 625 | camera | The picture is dark. Turn on a light in front of you. | ছবি অন্ধকার। সামনে একটা আলো জ্বালান। |
| 626 | camera | The light is behind you, so your face is dark. Face the window or lamp instead. | আলো আপনার পেছনে, তাই মুখ অন্ধকার। জানালা বা বাতির দিকে মুখ করে বসুন। |
| 627 | camera | Lighting is good. | আলো ঠিক আছে। |
| 628 | camera | Camera is busy: another app is using it | ক্যামেরা ব্যস্ত: অন্য একটি অ্যাপ এটি ব্যবহার করছে |
| 629 | camera | Close the other app (a video call or a browser tab), then try again. | অন্য অ্যাপটি (ভিডিও কল বা ব্রাউজারের ট্যাব) বন্ধ করে আবার চেষ্টা করুন। |
| 630 | camera | Camera is blocked | ক্যামেরা বন্ধ করা আছে |
| 631 | camera | Allow camera access in Windows Settings → Privacy & security → Camera, then try again. | Windows Settings → Privacy & security → Camera-তে ক্যামেরার অনুমতি দিয়ে আবার চেষ্টা করুন। |
| 632 | camera | No camera found | কোনো ক্যামেরা পাওয়া যায়নি |
| 633 | camera | Plug in a camera, or pick another one in Settings, then try again. | একটি ক্যামেরা লাগান, বা সেটিংসে অন্যটি বেছে নিন, তারপর আবার চেষ্টা করুন। |
| 634 | camera | The camera did not start | ক্যামেরা চালু হয়নি |
| 635 | camera | Try again. If it keeps failing, restart Desk Watch. | আবার চেষ্টা করুন। বারবার ব্যর্থ হলে Desk Watch আবার চালু করুন। |
| 636 | day | Study block | পড়ার ব্লক |
| 637 | day | {from}–{to} · weekly block | {from}–{to} · সাপ্তাহিক ব্লক |
| 638 | day | done | সম্পন্ন |
| 639 | day | task | কাজ |
| 640 | day | running | চলছে |
| 641 | day | {m} min focused | {m} মিনিট মনোযোগ |
| 642 | day | Study session | পড়ার Session |
| 643 | day | {n} of {goal} | {goal}-এর মধ্যে {n} |
| 644 | day | Estimated {est} pomodoro ({time}), took {took}. | আনুমানিক {est}টি Pomodoro ({time}), লেগেছে {took}টি। |
| 645 | day | Estimated {est} pomodoros ({time}), took {took}. | আনুমানিক {est}টি Pomodoro ({time}), লেগেছে {took}টি। |
| 646 | focus | Work, then a short break; a long break after a few | কাজ, তারপর ছোট Break; কয়েকটির পরে Long break |
| 647 | focus | Countdown | Countdown |
| 648 | focus | Any length, counts down | যেকোনো দৈর্ঘ্য, উল্টো দিকে গোনে |
| 649 | focus | Count-up | Count-up |
| 650 | focus | A stopwatch, up to a limit | স্টপওয়াচ, একটা সীমা পর্যন্ত |
| 651 | focus | {done} of {est} pomodoros | {est}টির মধ্যে {done}টি Pomodoro |
| 652 | focus | pomodoro {k} of {every} | {every}টির মধ্যে {k} নম্বর Pomodoro |
| 653 | focus | Black | কালো |
| 654 | focus | Dark grey | গাঢ় ধূসর |
| 655 | focus | Deep green | গাঢ় সবুজ |
| 656 | focus | Deep blue | গাঢ় নীল |
| 657 | focus | Warm white | উষ্ণ সাদা |
| 658 | focus | Light grey | হালকা ধূসর |
| 659 | focus | Pale green | হালকা সবুজ |
| 660 | focus | Pale blue | হালকা নীল |
| 661 | power | Lighter phone model | হালকা ফোন-মডেল |
| 662 | power | Lighter phone model, 2 checks a second | হালকা ফোন-মডেল, সেকেন্ডে ২ বার দেখা |
| 663 | setup | Camera images are never uploaded and never saved, except test clips you choose to record on the Debug tab. | ক্যামেরার ছবি কখনো আপলোড বা সংরক্ষণ করা হয় না, শুধু Debug ট্যাবে আপনি নিজে যে টেস্ট ক্লিপ রেকর্ড করেন সেগুলো ছাড়া। |
| 664 | setup | Face | মুখ |
| 665 | setup | Raise the camera or tilt it up so it sees your face. | ক্যামেরা উঁচু করুন বা ওপরে কাত করুন যাতে মুখ দেখা যায়। |
| 666 | setup | Hands | হাত |
| 667 | setup | Put both hands on the desk. Tilt the camera down or move it back until it sees them. | দুই হাত টেবিলে রাখুন। হাত দেখা না যাওয়া পর্যন্ত ক্যামেরা নিচে কাত করুন বা পেছনে সরান। |
| 668 | setup | Desk | টেবিল |
| 669 | setup | Your hands are high in the picture. Tilt the camera down so the desk fills the lower part. | ছবিতে আপনার হাত অনেক ওপরে। ক্যামেরা নিচে কাত করুন যাতে নিচের অংশ টেবিলে ভরে যায়। |
| 670 | setup | Tilt the camera down so your desk and hands fill the lower part of the picture. | ক্যামেরা নিচে কাত করুন যাতে ছবির নিচের অংশে টেবিল আর হাত আসে। |
| 671 | setup | Study as you normally would. In a moment you will pick up your phone. | স্বাভাবিকভাবে পড়ুন। একটু পরে আপনি ফোন তুলবেন। |
| 672 | setup | Now pick up your phone and look at it. | এবার ফোন তুলে সেদিকে তাকান। |
| 673 | setup | That is the alarm. Put the phone down. | এটাই অ্যালার্ম। ফোন নামিয়ে রাখুন। |
| 674 | setup | The clock is running again. That is how a session works. | ঘড়ি আবার চলছে। Session এভাবেই কাজ করে। |
| 675 | setup | The phone alarm did not ring within 10 seconds. The camera may not see your hands well: check the aim. | ১০ সেকেন্ডের মধ্যে ফোনের অ্যালার্ম বাজেনি। ক্যামেরা হয়তো আপনার হাত ভালো দেখছে না: ক্যামেরার দিক দেখুন। |
| 676 | setup | Pick how many focused minutes you want to study. | কত মিনিট মনোযোগ দিয়ে পড়তে চান বেছে নিন। |
| 677 | setup | Rings an alarm when you pick up your phone, leave or look away. | ফোন তুললে, উঠে গেলে বা অন্য দিকে তাকালে অ্যালার্ম বাজায়। |
| 678 | setup | Blocks the sites and apps on your list while you study. | পড়ার সময় আপনার তালিকার সাইট ও অ্যাপ বন্ধ রাখে। |
| 679 | setup | Starts the session. The clock only runs while you are studying. | Session শুরু করে। আপনি পড়লে তবেই ঘড়ি চলে। |
| 680 | setup | Link a task, calibrate your place, edit block lists or show the camera. | কোনো কাজ যুক্ত করুন, জায়গা calibrate করুন, ব্লক তালিকা বদলান বা ক্যামেরা দেখুন। |
| 681 | setup | Your tasks and weekly study blocks. A block reminds you when it starts. | আপনার কাজ আর সাপ্তাহিক পড়ার ব্লক। ব্লক শুরু হলে মনে করিয়ে দেয়। |
| 682 | setup | Every session, with your focused time and what distracted you. | প্রতিটি Session, আপনার মনোযোগের সময় আর কী আপনার মনোযোগ নষ্ট করেছে। |
| 683 | setup | Four views | চার ধরনের দেখা |
| 684 | setup | Your to-do list, a board (to do, doing, done), your week, and one day on a time line. | আপনার কাজের তালিকা, একটি Board (করতে হবে, চলছে, সম্পন্ন), আপনার সপ্তাহ, আর সময়রেখায় একটি দিন। |
| 685 | setup | Today, tomorrow, this week and more, and the subjects you make. Each shows what is left. | আজ, আগামীকাল, এই সপ্তাহ ও আরও, আর আপনার বানানো বিষয়গুলো। প্রতিটিতে দেখায় কী বাকি। |
| 686 | setup | Add a task | একটি কাজ যোগ করুন |
| 687 | setup | Type it and press Enter. Words like tomorrow, #Physics, !1 or ~3 become chips. | লিখে Enter চাপুন। আগামীকাল, #পদার্থবিজ্ঞান, !১ বা ~৩-এর মতো শব্দ আলাদা চিহ্ন হয়ে যায়। |
| 688 | setup | Pick a period | সময়কাল বেছে নিন |
| 689 | setup | Today, the last 7 days or the last 30 days. | আজ, শেষ ৭ দিন বা শেষ ৩০ দিন। |
| 690 | setup | Three numbers | তিনটি সংখ্যা |
| 691 | setup | Focused time, distractions and your longest stretch of focus. | মনোযোগের সময়, মনোযোগ নষ্ট হওয়া আর সবচেয়ে লম্বা টানা মনোযোগ। |
| 692 | setup | Each day | প্রতিটি দিন |
| 693 | setup | Click a day to see its sessions and their reports. | কোনো দিনে ক্লিক করলে সেই দিনের Session আর তাদের রিপোর্ট দেখবেন। |
| 694 | setup | Default length, break length and strict mode. | স্বাভাবিক দৈর্ঘ্য, Break-এর দৈর্ঘ্য আর Strict mode। |
| 695 | setup | Detection thresholds, workstations and the Debug tab. Most people never need it. | শনাক্তকরণের সীমা, পড়ার জায়গা আর Debug ট্যাব। বেশিরভাগ মানুষের কখনো দরকার হয় না। |
| 696 | todo | Planned | পরিকল্পিত |
| 697 | todo | All tasks | সব কাজ |
| 698 | todo | Completed | সম্পন্ন |
| 699 | todo | {h} h {m} min | {h} ঘণ্টা {m} মিনিট |
| 700 | todo | {h} h | {h} ঘণ্টা |
| 701 | todo | High priority | বেশি গুরুত্ব |
| 702 | todo | Normal priority | সাধারণ গুরুত্ব |
| 703 | todo | Low priority | কম গুরুত্ব |
| 704 | todo | Due {date} | জমা {date} |
| 705 | todo | #{name} (new) | #{name} (নতুন) |
| 706 | todo | Due today | আজ জমা |
| 707 | todo | Due tomorrow | আগামীকাল জমা |
| 708 | backup | This backup is damaged. | এই ব্যাকআপটি নষ্ট। |
| 709 | backup | This is not a Desk Watch backup. | এটি Desk Watch-এর ব্যাকআপ নয়। |
| 710 | backup | This backup was made by a newer version of Desk Watch. | এই ব্যাকআপটি Desk Watch-এর নতুন কোনো সংস্করণে তৈরি। |
| 711 | backup | This file could not be read as a Desk Watch backup. | এই ফাইলটি Desk Watch-এর ব্যাকআপ হিসেবে পড়া গেল না। |
| 712 | backup, main | Backup not found. | ব্যাকআপ পাওয়া যায়নি। |
| 713 | db | This data was made by a newer version of Desk Watch (database version {v}). Please update the app. | এই ডেটা Desk Watch-এর নতুন কোনো সংস্করণে তৈরি (ডেটাবেস সংস্করণ {v})। দয়া করে অ্যাপটি হালনাগাদ করুন। |
| 714 | db | No such block set. | এমন কোনো ব্লক সেট নেই। |
| 715 | db | There is no block set. Make one first. | কোনো ব্লক সেট নেই। আগে একটি তৈরি করুন। |
| 716 | db | Give the set a name. | সেটটির একটি নাম দিন। |
| 717 | db | There is already a set called "{name}". | "{name}" নামে একটি সেট আগে থেকেই আছে। |
| 718 | db | Keep at least one block set. | অন্তত একটি ব্লক সেট রাখুন। |
| 719 | db | This is not a Desk Watch export file. | এটি Desk Watch-এর রপ্তানি করা ফাইল নয়। |
| 720 | db | This file was made by a newer version of Desk Watch. | এই ফাইলটি Desk Watch-এর নতুন কোনো সংস্করণে তৈরি। |
| 721 | db | Unknown table "{name}" in the file. | ফাইলে অচেনা টেবিল "{name}"। |
| 722 | db | "{name}" is not a list. | "{name}" কোনো তালিকা নয়। |
| 723 | db | Bad row in "{name}". | "{name}"-এ ভুল সারি। |
| 724 | db | Unknown column "{col}" in "{name}". | "{name}"-এ অচেনা কলাম "{col}"। |
| 725 | db | Bad value for "{col}" in "{name}". | "{name}"-এ "{col}"-এর মান ভুল। |
| 726 | db | That subject no longer exists. | ওই বিষয়টি আর নেই। |
| 727 | db | Give the subject a name. | বিষয়টির একটি নাম দিন। |
| 728 | db | There is already a subject called "{name}". | "{name}" নামে একটি বিষয় আগে থেকেই আছে। |
| 729 | db | That task no longer exists. | ওই কাজটি আর নেই। |
| 730 | db | That block set no longer exists. | ওই ব্লক সেটটি আর নেই। |
| 731 | main | Open Desk Watch | Desk Watch খুলুন |
| 732 | main | Quit | বন্ধ করুন |
| 733 | main | Desk Watch cannot open its data | Desk Watch তার ডেটা খুলতে পারছে না |
| 734 | main | File: {path} | ফাইল: {path} |
| 735 | main | Desk Watch is still watching | Desk Watch এখনো দেখছে |
| 736 | main | Your session keeps running. Click the tray icon to open it, or end the session first to quit. | আপনার Session চলছে। খুলতে ট্রে-এর আইকনে ক্লিক করুন, বা বন্ধ করতে আগে Session শেষ করুন। |
| 737 | main | Desk Watch: session running | Desk Watch: Session চলছে |
| 738 | main | During a session you can only add blocked sites and apps. | Session চলার সময় শুধু বন্ধ করার সাইট ও অ্যাপ যোগ করা যায়। |
| 739 | main | Block sets cannot be changed during a session. | Session চলার সময় ব্লক সেট বদলানো যায় না। |
| 740 | main | End your session first. | আগে Session শেষ করুন। |
| 741 | main | Nothing was changed. | কিছুই বদলায়নি। |
| 742 | main | Backup failed. | ব্যাকআপ হয়নি। |
| 743 | main | Restore failed. | পুনরুদ্ধার হয়নি। |
| 744 | main | Study block at {time}: {task} | {time}-এ পড়ার ব্লক: {task} |
| 745 | main | {min} min. Click to get it ready in Desk Watch. | {min} মিনিট। Desk Watch-এ তৈরি করে রাখতে ক্লিক করুন। |
| 746 | planner | Pick a day. | একটি দিন বেছে নিন। |
| 747 | planner | Pick a start time. | শুরুর সময় বেছে নিন। |
| 748 | planner | Length must be 5 to 600 minutes. | দৈর্ঘ্য ৫ থেকে ৬০০ মিনিট হতে হবে। |
| 749 | planner | A block must end by midnight. | ব্লক মাঝরাতের মধ্যে শেষ হতে হবে। |
| 750 | planner | It overlaps the block at {from}–{to}. | এটি {from}–{to}-এর ব্লকের সঙ্গে মিলে যাচ্ছে। |
| 751 | planner | Give the task a title. | কাজটির একটি শিরোনাম দিন। |
| 752 | planner | The due date is not a date. | জমার তারিখটি কোনো তারিখ নয়। |
| 753 | planner | The estimate must be 1 to 9999 minutes. | আনুমানিক সময় ১ থেকে ৯৯৯৯ মিনিট হতে হবে। |
| 754 | planner | The time is not a time. | সময়টি কোনো সময় নয়। |
| 755 | db | Give the routine a name. | রুটিনের একটি নাম দিন। |
| 756 | db | That routine no longer exists. | রুটিনটি আর নেই। |
| 757 | db | A routine with that name already exists. | এই নামে একটি রুটিন আগে থেকেই আছে। |
| 758 | db | That block is not on that day. | সেদিন এই ব্লকটি নেই। |
| 759 | db | My routine | আমার রুটিন |
| 760 | routines | Time slot {n}: pick at least one day. | সময় {n}: অন্তত একটি দিন বেছে নিন। |
| 761 | routines | {day}: {problem} | {day}: {problem} |
| 762 | BlockWarning | {name} is blocked. Close it, or the alarm rings in {s} s. | {name} বন্ধ রাখার তালিকায় আছে। এটি বন্ধ করুন, নইলে {s} সেকেন্ডে অ্যালার্ম বাজবে। |
| 763 | BlockWarning | {site} is blocked. Going back to it within 2 minutes, or a 3rd blocked visit this session, rings the alarm. | {site} বন্ধ রাখার তালিকায় আছে। ২ মিনিটের মধ্যে আবার গেলে, বা এই Session-এ তৃতীয়বার বন্ধ সাইটে গেলে, অ্যালার্ম বাজবে। |
| 764 | accounting | Blocked site: {name} | বন্ধ করা সাইট: {name} |
| 765 | Routines | Routine | রুটিন |
| 766 | Routines | None (no blocks) | কোনোটি নয় (কোনো ব্লক নেই) |
| 767 | Routines | Edit routine | রুটিন বদলান |
| 768 | Routines | New routine | নতুন রুটিন |
| 769 | Routines | One routine is on at a time. Switching or editing changes today and later; past days keep their plan. | একবারে একটি রুটিন চালু থাকে। বদলালে বা সম্পাদনা করলে আজ ও পরের দিনগুলো বদলায়; আগের দিনগুলোর পরিকল্পনা আগের মতোই থাকে। |
| 770 | Routines | Previous week | আগের সপ্তাহ |
| 771 | Routines | Next week | পরের সপ্তাহ |
| 772 | Routines | No routine yet | এখনো কোনো রুটিন নেই |
| 773 | Routines | A routine is your study times for a week, e.g. "HSC weekly": each time slot on one or more days. When a block starts, Desk Watch reminds you. | রুটিন হলো এক সপ্তাহের পড়ার সময়, যেমন "HSC সাপ্তাহিক": প্রতিটি সময় এক বা একাধিক দিনে। কোনো ব্লক শুরু হলে Desk Watch মনে করিয়ে দেয়। |
| 774 | Routines | Skipped this day | এই দিন বাদ |
| 775 | Routines | Moved this day | এই দিন সরানো হয়েছে |
| 776 | Routines | Skip this day | এই দিন বাদ দিন |
| 777 | Routines | Change this day | এই দিন বদলান |
| 778 | Routines | End time | শেষের সময় |
| 779 | Routines | Save | সংরক্ষণ করুন |
| 780 | Routines | Routine editor | রুটিন সম্পাদনা |
| 781 | Routines | Name | নাম |
| 782 | Routines | e.g. HSC weekly | যেমন HSC সাপ্তাহিক |
| 783 | Routines | On (switches the others off) | চালু (অন্যগুলো বন্ধ হয়ে যাবে) |
| 784 | Routines | Changes apply from today; past days keep their plan, and sessions and stats never change. | পরিবর্তন আজ থেকে কার্যকর; আগের দিনগুলোর পরিকল্পনা থাকে, আর Session ও পরিসংখ্যান কখনো বদলায় না। |
| 785 | Routines | Days | দিন |
| 786 | Routines | For | কিসের জন্য |
| 787 | Routines | Days of time slot {n} | সময় {n}-এর দিনগুলো |
| 788 | Routines | Start of time slot {n} | সময় {n}-এর শুরু |
| 789 | Routines | End of time slot {n} | সময় {n}-এর শেষ |
| 790 | Routines | What time slot {n} is for | সময় {n} কিসের জন্য |
| 791 | Routines | Study (no subject) | পড়া (কোনো বিষয় নয়) |
| 792 | Routines | Tasks | কাজ |
| 793 | Routines | Remove time slot {n} | সময় {n} সরান |
| 794 | Routines | + Time slot | + সময় |
| 795 | Routines | Copy this day | এই দিনটি কপি করুন |
| 796 | Routines | to | থেকে এই দিনগুলোতে |
| 797 | Routines | Copy to these days | এই দিনগুলোতে কপি করুন |
| 798 | Routines | Copy | কপি করুন |
| 799 | Routines | Nothing was saved: | কিছুই সংরক্ষণ হয়নি: |
| 800 | Routines | Save routine | রুটিন সংরক্ষণ করুন |
| 801 | Routines | Delete the routine “{name}”? Its blocks go too (also from past days’ plan); sessions and stats stay. | রুটিন “{name}” মুছে ফেলবেন? এর ব্লকগুলোও যাবে (আগের দিনগুলোর পরিকল্পনা থেকেও); Session ও পরিসংখ্যান থাকবে। |
| 802 | Routines | Delete routine | রুটিন মুছুন |
