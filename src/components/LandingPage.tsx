import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import { useNavigate } from 'react-router';
import './LandingPage.css';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });

  // Smooth scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 20,
    restDelta: 0.001
  });

  // Hero parallax
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(smoothProgress, [0, 0.2], [1, 1.2]);
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, 100]);

  // Section 3 parallax
  const s3BgY = useTransform(smoothProgress, [0.4, 0.7], [-100, 100]);

  // Section 4 parallax
  const s4BgY = useTransform(smoothProgress, [0.7, 1], [-50, 50]);

  return (
    <div className="landing-container" ref={scrollRef}>
      {/* Navigation Header */}
      <nav className="landing-nav">
        <div className="nav-content">
          <span className="logo">Network Rookie</span>
          <button className="nav-btn" onClick={() => navigate('/explore')}>
            Try it now →
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-section hero">
        <motion.div
          className="section-bg"
          style={{
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY,
            backgroundImage: `url('https://images.unsplash.com/photo-1534996858221-380b92700493?auto=format&fit=crop&q=80&w=2000')`
          }}
        />
        <div className="section-content">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="hero-text"
          >
            <span className="sub-tag">A BEGINNER'S GUIDE TO GLOBAL NETWORKS</span>
            <h1>The internet is not magic. It's millions of computers talking to each other.</h1>
            <p>A visual guide to how data travels across the planet — in the time it takes to blink.</p>
          </motion.div>
        </div>
      </section>

      {/* History Section */}
      <section className="landing-section history">
        <div className="section-content">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="text-block"
          >
            <span className="sub-tag">HISTORY — 1969</span>
            <h2>It started as an experiment to survive a nuclear war.</h2>
            <p>
              In 1969, a network called ARPANET connected just four university computers. The goal
              was resilience — a communication system that could survive a nuclear strike by rerouting
              data around destroyed nodes. Over the next few decades, that modest experiment became
              the infrastructure of human civilization. Today it spans every continent, every
              ocean floor, even Antarctica.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What it is Section */}
      <section className="landing-section what-it-is">
        <motion.div
          className="section-bg"
          style={{
            y: s3BgY,
            backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000')`
          }}
        />
        <div className="section-content">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ margin: "-20%" }}
            transition={{ duration: 1 }}
            className="text-block centered"
          >
            <span className="sub-tag">WHAT IT IS</span>
            <h2>Not a cloud. A wire — carrying light.</h2>
            <p>
              The internet is a vast collection of supercomputers — servers, routers, switches —
              connected by physical cables that span ocean floors and mountain ranges. Most of these
              cables are fiber optic: strands of glass thinner than a human hair, carrying pulses of laser
              light at 200,000 kilometers per second.
            </p>
            <p>
              Your message, your photo, your video call — they all travel as light, bouncing through
              glass, from one machine to the next, across continents, in under 100 milliseconds.
            </p>
            <blockquote className="quote">
              "There is no cloud. There is only light, traveling through glass."
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* Network Layers Section */}
      <section className="landing-section layers">
        <motion.div
          className="section-bg dimmed"
          style={{
            y: s4BgY,
            backgroundImage: `url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=2000')`
          }}
        />
        <div className="section-content">
          <div className="layers-grid">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="layers-text"
            >
              <span className="sub-tag">NETWORK LAYERS</span>
              <h2>Your message moves through invisible layers.</h2>
              <p>
                When you send a message, it doesn't travel as one piece. It's broken into small packets,
                each addressed and routed independently, then reassembled at the destination —
                all within milliseconds. Each step is governed by a different layer of protocol.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="layers-table"
            >
              {[
                { num: '01', title: 'Physical', desc: 'The actual cable, fiber, or radio signal carrying the raw bits.' },
                { num: '02', title: 'Data Link', desc: 'Packages bits into frames, handles hardware-to-device delivery on a local network.' },
                { num: '03', title: 'Network', desc: 'Addresses and routes packets across different networks. This is IP.' },
                { num: '04', title: 'Transport', desc: 'Ensures packets arrive completely and in order. This is TCP.' },
                { num: '05', title: 'Application', desc: 'The protocol your app speaks: HTTP, DNS, SMTP.' },
              ].map((layer) => (
                <div key={layer.num} className="layer-row">
                  <span className="num">{layer.num}</span>
                  <span className="title">{layer.title}</span>
                  <span className="desc">{layer.desc}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <span>© 2026 Network Rookie</span>
          <a href="https://github.com/nabilrn" target="_blank" rel="noreferrer">github.com/nabilrn</a>
        </div>
      </footer>
    </div>
  );
};
