import React, {useState, useEffect} from "react";
import Link from "next/link";
import { useStateContext } from "../../../context/StateContext";
import { AiFillInstagram, AiOutlineTwitter, AiFillFacebook, AiOutlineWhatsApp } from "react-icons/ai";
import { useTranslation } from "react-i18next";


const Footer = () => {
    const { i18n } = useTranslation();
    const { showCart } = useStateContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // 🔥 prevents hydration error

    const isRTL = i18n.language === "ar"; // true if Arabic

  return (
    <>
        <div className="footerContainer" dir={isRTL ? "rtl" : "ltr"} >
            <div className="footerContent">
                <div>
                    <Link href="/delivery">{isRTL? "التوصيل" : "Delivery"}</Link>
                    <Link href="/privacy">{isRTL? "الخصوصية" : "Privacy"}</Link>
                    <Link href="/terms">{isRTL? "شروط وقواعد البيع" : "Terms and Conditions of Sale"}</Link>
                    <Link href="/contact">{isRTL? "التواصل معنا" : "Contact Us"}</Link>
                </div>
                <div>{isRTL?  "التواصل sales@Munchix.com: " : "Contact: sales@Munchix.com"}</div>
            </div>
                
            <div className="iconContainer">
                
                <div className="icons">
                    <a href="https://www.instagram.com/Munchix" target="_blank" rel="noopener noreferrer">
                        <AiFillInstagram   color="#E1306C"  className="social-media-icon"/> {/* Instagram */}
                    </a>
                    <a href="https://twitter.com/Munchix" target="_blank" rel="noopener noreferrer">
                        <AiOutlineTwitter  color="#1DA1F2" className="social-media-icon" /> {/* Twitter */}
                    </a>
                    <a href="https://www.facebook.com/share/Munchix" target="_blank" rel="noopener noreferrer">
                        <AiFillFacebook    color="#1877F2" className="social-media-icon" /> {/* Facebook */}
                    </a>
                    <a href="https://wa.me/201005126629" target="_blank" rel="noopener noreferrer">
                        <AiOutlineWhatsApp color="#25D366" className="social-media-icon" /> {/* WhatsApp */}
                    </a>
                </div>
            </div>
        </div>
        <p className="copyright">{isRTL? "2006 جميع الحقوق محفوظة لـ Munchix.شوب " : "2026 Munchix.shop All rights reserved"}</p>

    </>
  );
};

export default Footer;
