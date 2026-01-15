"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-fade";

export default function Hero() {
  // inject CSS (1-file approach)
  useEffect(() => {
    const id = "hero-creative-slider-css";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');

      .creative-bg--slider{
        position:relative;
        width:100%;
        height:100vh;
        display:block;
        overflow:hidden;
        font-family:"DM Sans", sans-serif;
        background:#eee;
      }

      .creative-bg--slider .creative-slider--wrap{
        position:absolute;
        top:0; left:0;
        display:flex;
        align-items:stretch;
        width:100%;
        height:100%;
      }

      .creative-slider--wrap .swiper{
        width:100%;
        height:100%;
      }

      .creative-slider--wrap .swiper-slide .slide-bg{
        background-position:center;
        background-size:cover;
        width:100%;
        height:100%;
      }

      /* overlay */
      .creative-bg--slider .creative-slider--wrap .slide-bg:before{
        content:" ";
        width:100%;
        height:100%;
        position:absolute;
        top:0; left:0;
        background: rgba(252, 252, 252, .60);
      }

      .creative-bg--slider .slider-content{
        position:absolute;
        top:0; left:0;
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:10;
        padding: 0 16px;
      }

      .slider-content .content-row{
        display:flex;
        align-items:center;
        justify-content:center;
        width:100%;
        text-align:center;
        height:100%;
      }

      .content-row .content-column{
        max-width:65%;
        margin:0 auto;
      }

      .content-column .slide-subheading{
        margin-top:0;
        font-size:20px;
        font-weight:500;
        text-transform:uppercase;
        letter-spacing:0.06em;
        line-height:1.2;
        color:#010101;
        transition: opacity .5s ease, filter .5s ease;
        animation: fadeInUp 1s ease forwards;
        opacity:0;
        filter: blur(4px);
        animation-delay: .3s;
      }

      .content-column .slide-heading{
        font-size:86px;
        font-weight:600;
        line-height:1.085;
        letter-spacing:-0.035em;
        margin-top:0;
        margin-bottom:50px;
        opacity:0;
        filter: blur(4px);
        transition: opacity .5s ease, filter .5s ease;
        animation: fadeInUp 1s ease forwards;
        animation-delay: .5s;
      }

      .content-column .creative-btns--wrap{
        margin-top:20px;
        display:inline-flex;
        transition: opacity .5s ease, filter .5s ease;
        animation: fadeInUp 1s ease forwards;
        opacity:0;
        filter: blur(4px);
        animation-delay: .7s;
      }

      .creative-btns--wrap .creative-btn{
        margin:0 10px;
        padding:11px 32px 10px;
        font-size:13px;
        letter-spacing:0.085em;
        color:#010101;
        border:1px solid #010101;
        background:transparent;
        border-radius:4px;
        font-weight:700;
        text-transform:uppercase;
        text-decoration:none;
        display:inline-block;
      }

      .creative-btns--wrap .creative-btn.btn-fill{
        background-color:#010101;
        color:#fff;
      }

      .creative-btns--wrap .creative-btn .btn-animate-y{
        position:relative;
        display:block;
        overflow:hidden;
      }

      .creative-btns--wrap .creative-btn .btn-animate-y-1{
        display:block;
        transition: all .37s cubic-bezier(.15,.7,.78,1), opacity .37s linear;
      }

      .creative-btns--wrap .creative-btn .btn-animate-y-2{
        display:block;
        position:absolute;
        top:0;
        left:0;
        width:100%;
        opacity:0;
        transform: translate(0, 100%);
        transition: all .37s cubic-bezier(.15,.7,.78,1), opacity .37s linear;
      }

      .creative-btns--wrap .creative-btn:hover .btn-animate-y-1{
        opacity:0;
        transform: translate(0, -100%);
      }

      .creative-btns--wrap .creative-btn:hover .btn-animate-y-2{
        opacity:1;
        transform: translate(0, 0);
      }

      .creative-status{
        position:absolute;
        bottom:30px;
        width:220px;
        font-size:16px;
        line-height:1.375;
        padding-left:10px;
        color:black;
        border-left:2px solid;
        left:30px;
        opacity:0;
        filter: blur(4px);
        transition: opacity .5s ease, filter .5s ease;
        animation: fadeInRight 1s ease forwards;
        animation-delay: .5s;
        z-index: 11;
      }

      @keyframes fadeInUp {
        0% { opacity:0; transform: translate3d(0, 37px, 0); }
        100% { opacity:1; transform: translate3d(0, 0, 0); filter: blur(0); }
      }

      @keyframes fadeInRight {
        0% { opacity:0; transform: translateX(50px); }
        100% { opacity:1; transform: translateX(0); filter: blur(0); }
      }

      /* Responsive */
      @media only screen and (max-width: 1366px){
        .content-row .content-column{ max-width:100%; padding: 0 30px; }
        .creative-status{ display:none; }
      }

      @media only screen and (max-width: 981px){
        .content-column .slide-heading{ font-size:67px; }
      }

      @media only screen and (max-width: 575px){
  .content-row .content-column{ padding: 0 10px; }

  .content-column .slide-heading{
    font-size:46px;
    margin-bottom:25px;
    color:#010101; 
  }

  .content-column .creative-btns--wrap{
    flex-direction:column;
    width:100%;
  }

  .creative-btns--wrap .creative-btn{
    margin:0 0 15px 0;
    width:min(320px, 100%);
    text-align:center;
  }

  .content-column .slide-subheading{ font-size:16px; }
}
    `;
    document.head.appendChild(style);
  }, []);

  // slides: αφού θες 1 εικόνα /public/home.jpg, το βάζω 3 φορές όπως στο template
  const slides = ["/home.jpg", "/home.jpg", "/home.jpg"];

  return (
    <section className="creative-bg--slider">
      <div className="creative-slider--wrap" aria-hidden>
        <Swiper
          className="creative-slider"
          modules={[Autoplay, EffectFade]}
          effect="fade"
          speed={1000}
          fadeEffect={{ crossFade: true }}
          autoplay={{ delay: 10000, disableOnInteraction: false }}
          slidesPerView={1}
          loop
        >
          {slides.map((src, idx) => (
            <SwiperSlide key={idx}>
              <div
                className="slide-bg"
                style={{ backgroundImage: `url('${src}')` }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="slider-content">
        <div className="content-row">
          <div className="content-column">
            <h2 className="slide-subheading">GOODJOBEUROPE | Job Matching Platform</h2>
            <h1 className="slide-heading">
              Find your next job in Europe.
            </h1>

            <div className="creative-btns--wrap">
              <Link href="/auth/register" className="creative-btn">
                <span className="btn-animate-y">
                  <span className="btn-animate-y-1">Start for free</span>
                  <span className="btn-animate-y-2" aria-hidden="true">
                    Start for free
                  </span>
                </span>
              </Link>

              <Link href="#pricing" className="creative-btn btn-fill">
                <span className="btn-animate-y">
                  <span className="btn-animate-y-1">View plans</span>
                  <span className="btn-animate-y-2" aria-hidden="true">
                    View plans
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="creative-status">Based in Europe • Remote & On-site</div>
      </div>
    </section>
  );
}

