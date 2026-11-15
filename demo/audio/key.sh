# Usage: source audio/key.sh   (exports ELEVENLABS_API_KEY from Claude Code's MCP config if not already set)
if [ -z "$ELEVENLABS_API_KEY" ]; then
  export ELEVENLABS_API_KEY=$(python3 -c "import json,os;d=json.load(open(os.path.expanduser('~/.claude.json')));print(next(p['mcpServers']['elevenlabs']['env']['ELEVENLABS_API_KEY'] for p in d.get('projects',{}).values() if 'elevenlabs' in p.get('mcpServers',{})))")
fi
