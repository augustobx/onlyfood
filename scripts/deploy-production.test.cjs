const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

test('production deploy refuses a disconnected Hub before invoking Docker', {skip:process.platform==='win32'}, ()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'onlyfood-deploy-'));
  try {
    fs.mkdirSync(path.join(root,'.git'));
    fs.mkdirSync(path.join(root,'scripts'));
    fs.mkdirSync(path.join(root,'bin'));
    fs.writeFileSync(path.join(root,'compose.npm.yaml'),'services: {}\n');
    fs.writeFileSync(path.join(root,'scripts/backup-production.sh'),'exit 99\n');
    fs.writeFileSync(path.join(root,'bin/docker'),'#!/bin/sh\necho DOCKER_PREFLIGHT_REACHED >&2\nexit 77\n',{mode:0o755});
    const base=Object.fromEntries(['DB_PASSWORD','DB_ROOT_PASSWORD','AUTH_SALT','NEXT_SERVER_ACTIONS_ENCRYPTION_KEY','BASE_DOMAIN','BASE_URL','R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_PUBLIC_URL','ENCRYPTION_KEY'].map(k=>[k,'fixture-'+k]));
    Object.assign(base,{STORAGE_PROVIDER:'r2',ALLOW_LOCAL_STORAGE:'false',SEED_DEMO_DATA:'false',HUB_MANAGEMENT_ENABLED:'true',HUB_INTEGRATION_TOKEN:'r'.repeat(64),HUB_MANAGEMENT_TOKEN:'m'.repeat(64)});
    for(const change of [{HUB_INTEGRATION_TOKEN:''},{HUB_MANAGEMENT_TOKEN:'short'},{HUB_MANAGEMENT_ENABLED:'false'},{HUB_MANAGEMENT_TOKEN:base.HUB_INTEGRATION_TOKEN},{}]) {
      fs.writeFileSync(path.join(root,'.env.docker'),Object.entries({...base,...change}).map(([k,v])=>k+'='+v).join('\n')+'\n');
      const result=spawnSync('bash',[path.join(__dirname,'deploy-production.sh')],{encoding:'utf8',env:{...process.env,ONLYFOOD_PROJECT_DIR:root,PATH:path.join(root,'bin')+path.delimiter+process.env.PATH}});
      assert.equal(result.error,undefined);
      const valid=Object.keys(change).length===0;
      assert.equal(result.status,valid?77:1,result.stderr);
      assert.equal(result.stderr.includes('DOCKER_PREFLIGHT_REACHED'),valid,result.stderr);
    }
    assert.equal(fs.readFileSync(path.join(root,'.secrets/next-server-actions.key'),'utf8'),base.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY);
    assert.equal(fs.statSync(path.join(root,'.secrets/next-server-actions.key')).mode&0o777,0o600);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
