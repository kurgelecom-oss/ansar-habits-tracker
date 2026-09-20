import {beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('../supabase-admin',()=>({adminClient:vi.fn()}));
import { signSession,validSession,requireSameOrigin,requireCron } from './auth';
beforeEach(()=>{process.env.ASSESSMENT_SESSION_SECRET='test-only-session-secret';process.env.ASSESSMENT_CRON_SECRET='test-only-cron-secret'});
describe('assessment authentication',()=>{
 it('accepts only signed, unexpired device sessions',()=>{const token=signSession(2000);expect(validSession(token,1000)).toBe(true);expect(validSession(token,2000)).toBe(false);expect(validSession(token+'x',1000)).toBe(false);expect(validSession(undefined)).toBe(false)});
 it('rejects cross-site and missing origin writes',()=>{expect(()=>requireSameOrigin(new Request('https://example.com/api/assessments'))).toThrow();expect(()=>requireSameOrigin(new Request('https://example.com/api/assessments',{headers:{origin:'https://evil.test'}}))).toThrow();expect(()=>requireSameOrigin(new Request('https://example.com/api/assessments',{headers:{origin:'https://example.com'}}))).not.toThrow()});
 it('rejects missing cron key without accepting empty config',()=>{expect(()=>requireCron(new Request('https://example.com'))).toThrow();expect(()=>requireCron(new Request('https://example.com',{headers:{authorization:'Bearer test-only-cron-secret'}}))).not.toThrow()});
});
