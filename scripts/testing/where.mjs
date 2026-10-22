// Exits 1 (and says so) when the running test copy's data folder is not the expected one.  node where.mjs <folder>
import { realpathSync } from 'node:fs';
import { main } from './cdp.mjs';
const got = await main("require('electron').app.getPath('userData')");
const want = realpathSync(process.argv[2]);
const same = String(got).toLowerCase() === want.toLowerCase();
if (!same) console.log('REFUSED: the test copy uses', got, 'instead of', want);
process.exit(same ? 0 : 1);
