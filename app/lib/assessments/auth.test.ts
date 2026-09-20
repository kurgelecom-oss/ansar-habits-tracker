import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('../supabase-admin',()=>({adminClient:vi.fn()}));
import { signSession,validSession,requireSameOrigin,requireCron } from './auth';
beforeEach(()=>{process.env.ASSESSMENT_SESSION_SECRET='test-only-session-secret';process.env.ASSESSMENT_CRON_SECRET='test-only-cron-secret'});
afterEach(()=>vi.unstubAllEnvs());
describe('assessment authentication',()=>{
 it('accepts only signed, unexpired device sessions',()=>{const token=signSession(2000);expect(validSession(token,1000)).toBe(true);expect(validSession(token,2000)).toBe(false);expect(validSession(token+'x',1000)).toBe(false);expect(validSession(undefined)).toBe(false)});
 it('rejects cross-site and missing origin writes',()=>{expect(()=>requireSameOrigin(new Request('https://example.com/api/assessments'))).toThrow();expect(()=>requireSameOrigin(new Request('https://example.com/api/assessments',{headers:{origin:'https://evil.test'}}))).toThrow();expect(()=>requireSameOrigin(new Request('https://example.com/api/assessments',{headers:{origin:'https://example.com'}}))).not.toThrow()});
 it('rejects missing cron key without accepting empty config',()=>{expect(()=>requireCron(new Request('https://example.com'))).toThrow();expect(()=>requireCron(new Request('https://example.com',{headers:{authorization:'Bearer test-only-cron-secret'}}))).not.toThrow()});
 it('accepts the configured public origin behind a production proxy',()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('ASSESSMENT_SITE_URL','https://ansar-habits-tracker.netlify.app');
  expect(()=>requireSameOrigin(new Request('http://internal-handler/api/assessments/session',{headers:{origin:'https://ansar-habits-tracker.netlify.app'}}))).not.toThrow();
 });
 it('does not trust forged forwarding headers or an internal origin in production',()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('ASSESSMENT_SITE_URL','https://ansar-habits-tracker.netlify.app');
  for(const origin of ['https://evil.test','http://internal-handler','null']){
   expect(()=>requireSameOrigin(new Request('http://internal-handler/api/assessments/session',{headers:{origin,'x-forwarded-host':'evil.test','x-forwarded-proto':'https'}}))).toThrow();
  }
 });
 it('allows the explicitly configured preview origin',()=>{
  vi.stubEnv('NODE_ENV','production');vi.stubEnv('ASSESSMENT_SITE_URL','https://ansar-habits-tracker.netlify.app');vi.stubEnv('DEPLOY_PRIME_URL','https://deploy-preview-11--ansar-habits-tracker.netlify.app');
  expect(()=>requireSameOrigin(new Request('http://internal-handler/api/assessments/session',{headers:{origin:'https://deploy-preview-11--ansar-habits-tracker.netlify.app'}}))).not.toThrow();
 });
 it('retains local development access with production site configuration',()=>{
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('ASSESSMENT_SITE_URL','https://ansar-habits-tracker.netlify.app');
  expect(()=>requireSameOrigin(new Request('http://localhost:3017/api/assessments/session',{headers:{origin:'http://localhost:3017'}}))).not.toThrow();
 });

});
