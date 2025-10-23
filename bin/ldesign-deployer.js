#!/usr/bin/env node

// @ldesign/deployer CLI 入口
import('../lib/cli.js').then(m => m.run()).catch(err => {
  console.error('Failed to start CLI:', err)
  process.exit(1)
})




