document.addEventListener('DOMContentLoaded', () => {
    // Scroll Animation Observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Header Scroll Effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Copy to Clipboard
    const copyBtn = document.querySelector('.copy-btn');
    const installCmd = document.querySelector('.install-cmd');

    if (copyBtn && installCmd) {
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(installCmd.textContent.trim());

                // Visual feedback
                const originalIcon = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyBtn.style.color = 'var(--accent)';

                setTimeout(() => {
                    copyBtn.innerHTML = originalIcon;
                    copyBtn.style.color = '';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    }

    // Terminal Typing Animation
    const terminalBody = document.querySelector('.terminal-body');
    const commands = [
        { cmd: 'docspls init my-project', output: '✓ Project initialized\n✓ Analyzing dependencies...\n✓ Found 12 dependencies' },
        { cmd: 'docspls mcp', output: '✓ MCP Server started on stdio\n✓ Ready for IDE integration...' }
    ];

    let currentStep = 0;

    async function typeWriter(text, element, speed = 50) {
        for (let i = 0; i < text.length; i++) {
            element.textContent += text.charAt(i);
            await new Promise(r => setTimeout(r, speed));
        }
    }

    async function runTerminal() {
        if (!terminalBody) return;

        terminalBody.innerHTML = '';

        for (const step of commands) {
            // Create command line
            const line = document.createElement('div');
            line.className = 'command-line';
            line.innerHTML = '<span class="prompt">➜</span> <span class="cmd"></span>';
            terminalBody.appendChild(line);

            const cmdSpan = line.querySelector('.cmd');
            await typeWriter(step.cmd, cmdSpan);

            await new Promise(r => setTimeout(r, 500));

            // Show output
            const output = document.createElement('span');
            output.className = 'output';
            output.innerText = step.output;
            terminalBody.appendChild(output);

            await new Promise(r => setTimeout(r, 1000));
        }

        // Loop animation
        setTimeout(runTerminal, 3000);
    }

    // Start terminal animation after a slight delay
    setTimeout(runTerminal, 1000);
});
