export function NotAPlaybook() {
  return (
    <div className="not-a-playbook">
      <div className="not-a-playbook-icon">&#128196;</div>
      <h2>Not an Ansible Playbook</h2>
      <p>
        This file does not appear to be an Ansible playbook.
        Playbooks should be YAML files containing a list of plays with
        <code>hosts</code>, <code>tasks</code>, or <code>roles</code> keys.
      </p>
      <p className="hint">
        Use the title bar button to switch back to the text editor.
      </p>
    </div>
  )
}
