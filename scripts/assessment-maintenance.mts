// Run with: node --env-file=.env.local --import tsx scripts/assessment-maintenance.mts
import {runMaintenance} from '../app/lib/assessments/service';
console.log(JSON.stringify(await runMaintenance(),null,2));
