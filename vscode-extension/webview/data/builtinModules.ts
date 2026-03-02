/**
 * Bundled ansible.builtin modules — always available offline.
 */

export interface BuiltinModule {
  name: string
  collection: string
  description: string
}

export interface BuiltinCategory {
  label: string
  modules: BuiltinModule[]
}

export const BUILTIN_CATEGORIES: BuiltinCategory[] = [
  {
    label: 'Files',
    modules: [
      { name: 'copy', collection: 'ansible.builtin', description: 'Copy files to remote' },
      { name: 'template', collection: 'ansible.builtin', description: 'Jinja2 templating' },
      { name: 'file', collection: 'ansible.builtin', description: 'Manage file properties' },
      { name: 'lineinfile', collection: 'ansible.builtin', description: 'Manage lines in files' },
      { name: 'blockinfile', collection: 'ansible.builtin', description: 'Manage blocks in files' },
      { name: 'fetch', collection: 'ansible.builtin', description: 'Fetch files from remote' },
      { name: 'stat', collection: 'ansible.builtin', description: 'Retrieve file status' },
      { name: 'find', collection: 'ansible.builtin', description: 'Find files matching criteria' },
      { name: 'replace', collection: 'ansible.builtin', description: 'Replace string in files' },
      { name: 'unarchive', collection: 'ansible.builtin', description: 'Unpack archives' },
      { name: 'assemble', collection: 'ansible.builtin', description: 'Assemble fragments into file' },
      { name: 'tempfile', collection: 'ansible.builtin', description: 'Create temporary files/dirs' },
    ],
  },
  {
    label: 'System',
    modules: [
      { name: 'command', collection: 'ansible.builtin', description: 'Run commands' },
      { name: 'shell', collection: 'ansible.builtin', description: 'Run shell commands' },
      { name: 'raw', collection: 'ansible.builtin', description: 'Run raw SSH commands' },
      { name: 'script', collection: 'ansible.builtin', description: 'Run local script on remote' },
      { name: 'service', collection: 'ansible.builtin', description: 'Manage services' },
      { name: 'systemd', collection: 'ansible.builtin', description: 'Manage systemd units' },
      { name: 'user', collection: 'ansible.builtin', description: 'Manage user accounts' },
      { name: 'group', collection: 'ansible.builtin', description: 'Manage groups' },
      { name: 'cron', collection: 'ansible.builtin', description: 'Manage cron jobs' },
      { name: 'hostname', collection: 'ansible.builtin', description: 'Set system hostname' },
      { name: 'reboot', collection: 'ansible.builtin', description: 'Reboot a machine' },
      { name: 'sysctl', collection: 'ansible.builtin', description: 'Manage sysctl entries' },
      { name: 'mount', collection: 'ansible.builtin', description: 'Manage mount points' },
    ],
  },
  {
    label: 'Packages',
    modules: [
      { name: 'apt', collection: 'ansible.builtin', description: 'Apt package manager' },
      { name: 'apt_key', collection: 'ansible.builtin', description: 'Manage apt GPG keys' },
      { name: 'apt_repository', collection: 'ansible.builtin', description: 'Manage apt repositories' },
      { name: 'yum', collection: 'ansible.builtin', description: 'Yum package manager' },
      { name: 'yum_repository', collection: 'ansible.builtin', description: 'Manage yum repositories' },
      { name: 'dnf', collection: 'ansible.builtin', description: 'DNF package manager' },
      { name: 'pip', collection: 'ansible.builtin', description: 'Python pip packages' },
      { name: 'package', collection: 'ansible.builtin', description: 'Generic package manager' },
      { name: 'package_facts', collection: 'ansible.builtin', description: 'Gather package facts' },
    ],
  },
  {
    label: 'Networking',
    modules: [
      { name: 'uri', collection: 'ansible.builtin', description: 'HTTP requests' },
      { name: 'get_url', collection: 'ansible.builtin', description: 'Download files from URL' },
      { name: 'slurp', collection: 'ansible.builtin', description: 'Read remote file as base64' },
    ],
  },
  {
    label: 'Control',
    modules: [
      { name: 'debug', collection: 'ansible.builtin', description: 'Print debug messages' },
      { name: 'fail', collection: 'ansible.builtin', description: 'Fail with message' },
      { name: 'assert', collection: 'ansible.builtin', description: 'Assert conditions' },
      { name: 'pause', collection: 'ansible.builtin', description: 'Pause execution' },
      { name: 'wait_for', collection: 'ansible.builtin', description: 'Wait for condition' },
      { name: 'wait_for_connection', collection: 'ansible.builtin', description: 'Wait for host connection' },
      { name: 'set_fact', collection: 'ansible.builtin', description: 'Set host facts' },
      { name: 'include_tasks', collection: 'ansible.builtin', description: 'Include tasks file' },
      { name: 'import_tasks', collection: 'ansible.builtin', description: 'Import tasks file' },
      { name: 'include_role', collection: 'ansible.builtin', description: 'Include a role' },
      { name: 'import_role', collection: 'ansible.builtin', description: 'Import a role' },
      { name: 'include_vars', collection: 'ansible.builtin', description: 'Include variables from file' },
      { name: 'add_host', collection: 'ansible.builtin', description: 'Add host to inventory' },
      { name: 'group_by', collection: 'ansible.builtin', description: 'Group hosts by fact' },
      { name: 'meta', collection: 'ansible.builtin', description: 'Execute meta actions' },
    ],
  },
  {
    label: 'Facts & Info',
    modules: [
      { name: 'setup', collection: 'ansible.builtin', description: 'Gather system facts' },
      { name: 'gather_facts', collection: 'ansible.builtin', description: 'Run fact-gathering modules' },
    ],
  },
  {
    label: 'Structure',
    modules: [
      { name: 'block', collection: '', description: 'Group tasks with error handling' },
    ],
  },
]
