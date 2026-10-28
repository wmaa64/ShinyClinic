import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useStateContext } from "../../context/StateContext";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/router";
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    Stethoscope,
    Gift,
    Package,
    Wallet,
    BarChart3,
    Settings,
    UserCog,
    BriefcaseBusiness,
    Tags,
    Wrench,
    Percent,
    Monitor,
    MapPinned,
    ScanLine,
    ClipboardList,
    CreditCard,
} from "lucide-react";

const NavBar = () => {

    const { t } = useTranslation();
    const { userInfo } = useStateContext();

    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const { i18n } = useTranslation();

    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    // =====================================================
    // OPEN / CLOSED MENUS
    // =====================================================

    const [openMenus, setOpenMenus] = useState({});

    const router = useRouter();


    // =====================================================
    // MOUNTED
    // =====================================================

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;


    // =====================================================
    // LANGUAGE
    // =====================================================

    const isRTL = i18n.language === "ar";


    // =====================================================
    // GENERIC MENU TOGGLE
    // =====================================================

    const toggleMenu = (menuName) => {

        setOpenMenus((prev) => ({
            ...prev,
            [menuName]: !prev[menuName],
        }));

    };


    // =====================================================
    // NAVBAR MENU CONFIGURATION
    // =====================================================

    const menuItems = [

        // -------------------------------------------------
        // DASHBOARD
        // -------------------------------------------------

        {
            type: "link",
            name: "dashboard",
            href: "/dashboard",
            labelEn: "DashBoard",
            labelAr: "لوحة المعلومات",
            icon: LayoutDashboard,
            roleIDs: [1,2,3,9, 10, 11],
        },


        // -------------------------------------------------
        // PATIENTS
        // -------------------------------------------------

        {
            type: "link",
            name: "patients",
            href: "/patients",
            labelEn: "Patients",
            labelAr: "المرضى",
            icon: Users,
            roleIDs: [1,2,3, 10, 11],
        },

        // -------------------------------------------------
        // APPOINTMENTS
        // -------------------------------------------------

        {
            type: "link",
            name: "appointments",
            href: "/appointments",
            labelEn: "Appointments",
            labelAr: "الحجوزات",
            icon: CalendarDays,
            roleIDs: [1,3, 10, 11],
        },

        // -------------------------------------------------
        // SESSIONS For RECEPTIONISTS
        // -------------------------------------------------

        {
            type: "menu",
            name: "sessions",
            labelEn: "Sessions",
            labelAr: "الجلسات",
            icon: Stethoscope,
            roleIDs: [1,3, 10, 11],

            children: [
                {
                    href: "/receptionSessions",
                    labelEn: "Sessions Registration",
                    labelAr: "تسجيل الجلسات",
                    icon: ClipboardList,
                    roleIDs: [1,3, 10, 11],
                },

                {
                    href: "/sessionDue",
                    labelEn: "Sessions Payments",
                    labelAr: " مدفوعات الجلسات",
                    icon: CreditCard,
                    roleIDs: [1,3, 10, 11],
                },

            ]
        },

        // -------------------------------------------------
        // Offers
        // -------------------------------------------------

        {
            type: "menu",
            name: "offers",
            labelEn: "Offers",
            labelAr: "العروض",
            icon: Gift,
            roleIDs: [1,3,9, 10, 11],

            children: [
                {
                    href: "/offerSubscriptions",
                    labelEn: "Subscriptions",
                    labelAr: "الاشتراكات",
                    icon: Tags,
                    roleIDs: [1,3, 9, 10, 11],
                },

                {
                    href: "/offerSubscriptionReport",
                    labelEn: "Patient Offers",
                    labelAr: "عروض مريض",
                    icon: ClipboardList,
                    roleIDs: [1,3, 9, 10, 11],
                },

            ]
        },

        // -------------------------------------------------
        // STORE
        // -------------------------------------------------

        {
            type: "menu",
            name: "store",
            labelEn: "Store",
            labelAr: "المخزن",
            icon: Package,
            roleIDs: [1,2,3,9, 10, 11],

            children: [
                {
                    href: "/store",
                    labelEn: "Store",
                    labelAr: "المخزون",
                    icon: Package,
                    roleIDs: [1,3,9, 10, 11],
                },

                {
                    href: "/supplies",
                    labelEn: "Supplies",
                    labelAr: "المستلزمات",
                    icon: ClipboardList,
                    roleIDs: [1,3,9, 10],
                },

                {
                    href: "/supplyUnits",
                    labelEn: "Supply Units",
                    labelAr: "وحدات المستلزمات",
                    icon: Wrench,
                    roleIDs: [1,3,9, 10],
                },

            ]
        },

        // -------------------------------------------------
        // MoneySafe
        // -------------------------------------------------

        {
            type: "link",
            name: "moneySafe",
            href: "/moneySafe",
            labelEn: "Money Safe",
            labelAr: "الخزنة المالية",
            icon: Wallet,
            roleIDs: [3, 11],
        },

        // -------------------------------------------------
        // QUERIES
        // -------------------------------------------------

        {
            type: "menu",
            name: "queries",
            labelEn: "Queries",
            labelAr: "الاستعلامات",
            icon: BarChart3,
            roleIDs: [1,2,3,9, 10, 11],

            children: [
                {
                    href: "/revenue",
                    labelEn: "Revenue for Period",
                    labelAr: "إيرادات عن فترة",
                    icon: BarChart3,
                    roleIDs: [1,9, 10, 11],
                },

                {
                    href: "/doctorRevenue",
                    labelEn: "Doctor Revenue",
                    labelAr: "إيرادات الطبيب",
                    icon: Percent,
                    roleIDs: [1,9, 10, 11],
                },

            ]
        },


        // =================================================
        // SETTINGS
        // =================================================

        {
            type: "menu",
            name: "settings",
            labelEn: "Settings",
            labelAr: "الاعدادات",
            icon: Settings,
            roleIDs: [1],

            children: [

                {
                    href: "/roles",
                    labelEn: "Roles",
                    labelAr: "الوظائف",
                    icon: BriefcaseBusiness,
                    roleIDs: [1],
                },

                {
                    href: "/users",
                    labelEn: "Users",
                    labelAr: "المستخدمين",
                    icon: UserCog,
                    roleIDs: [1],
                },

                {
                    href: "/offers",
                    labelEn: "Offers",
                    labelAr: "العروض",
                    icon: Gift,
                    roleIDs: [1, 10],
                },

                {
                    href: "/services",
                    labelEn: "Services",
                    labelAr: "الخدمات",
                    icon: Stethoscope,
                    roleIDs: [1, 10],
                },

                {
                    href: "/doctorRevenuePercentages",
                    labelEn: "Doctor Revenue Percentages",
                    labelAr: "نسب إيرادات طبيب",
                    icon: Percent,
                    roleIDs: [1, 10],
                },

                {
                    href: "/devices",
                    labelEn: "Devices",
                    labelAr: "الأجهزة",
                    icon: Monitor,
                    roleIDs: [1, 10],
                },

                {
                    href: "/treatmentAreas",
                    labelEn: "TreatmentAreas",
                    labelAr: "مناطق علاجية",
                    icon: MapPinned,
                    roleIDs: [1, 10],
                },

                {
                    href: "/laserTypes",
                    labelEn: "LaserTypes",
                    labelAr: "نواع الليزر",
                    icon: ScanLine,
                    roleIDs: [1, 10],
                },


            ],
        },

    ];


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="navbar-container" dir={isRTL ? "rtl" : "ltr"}>

            <h4>{isRTL ? "عيادة شيني سكين" : "Shiny Skin Clinic"}</h4>

            {userInfo && (
                
                <div className="subcategory-menu">

                    {menuItems.map((item) => {

                        const isAllowed = item.roleIDs.includes(Number(userInfo?.RoleID));
                        
                        // NORMAL LINK  =====================================
                        if (item.type === "link") {
                            return (
                                <Link key={item.name} href={isAllowed ? item.href : "#"} 
                                    className={`subcategory-link ${!isAllowed ? "disabled" : ""}`}
                                >
                                    {item.icon && <item.icon size={18} strokeWidth={2} className="linkicon" />}
                                    <span>{isRTL ? item.labelAr : item.labelEn}</span>
                                </Link>
                            );
                        }

                        // MENU WITH CHILDREN  =====================================
                        if (item.type === "menu") {

                            const isOpen =  !!openMenus[item.name];

                            return (

                                <React.Fragment   key={item.name}  >

                                    {/* PARENT BUTTON  --------------------------------- */}
                                    <button type="button" className="subcategory-link"
                                        onClick={() => toggleMenu(item.name)}
                                    >
                                        <span className="menu-label">
                                            {item.icon && <item.icon size={18} strokeWidth={2} className="linkicon" />}
                                            <span>{isRTL ? item.labelAr : item.labelEn }</span>
                                        </span>
                                        <span className="menu-arrow">{isOpen ? "▲"  : "▼" }</span>

                                    </button>

                                    {/* CHILDREN  --------------------------------- */}
                                    {isOpen && (

                                        <div className="menu-submenu">

                                            {item.children.map((child) => {
                                                
                                                const isAllowed = child.roleIDs.includes(Number(userInfo?.RoleID));

                                                return (
                                                    <Link  key={child.href}  href={isAllowed ? child.href : "#"}
                                                        className={`subcategory-link ${!isAllowed ? "disabled" : ""}`} 
                                                    >
                                                        {child.icon && <child.icon size={17} strokeWidth={2} 
                                                            className="linkicon" />}
                                                        <span>{isRTL ? child.labelAr : child.labelEn}</span>
                                                    </Link>
                                                )}
                                            )}

                                        </div>

                                    )}

                                </React.Fragment>

                            );

                        }

                        return null;

                    })}

                </div>
            )}

        </div>

    );

};

export default NavBar;






/*
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useStateContext } from "../../context/StateContext";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/router";

const NavBar = () => {
    const { t } = useTranslation();
    const { userInfo } = useStateContext();
    const [subcategories, setSubcategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const { i18n } = useTranslation();
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    
    const [openMenus, setOpenMenus] = useState({});


    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // 🔥 prevents hydration error

    const isRTL = i18n.language === "ar"; // true if Arabic


const handleSearch = (e) => {
    e.preventDefault();

    if (!search.trim()) return;

    router.push(`/search?q=${encodeURIComponent(search)}`);
};

const toggleMenu = (menuName) => {

    setOpenMenus((prev) => ({
        ...prev,
        [menuName]: !prev[menuName],
    }));

};
  
return (

<div className="navbar-container"  dir={isRTL ? "rtl" : "ltr"}>
    
    <h5>{isRTL ? "عيادة الجلدية" : "Dermatology Clinic" }</h5>

    <div className="subcategory-menu">
        <Link key="1" href="/patients" className="subcategory-link" >
            {isRTL ? "المرضى" : "Patients" }
        </Link>
        <Link key="2" href="/patients" className="subcategory-link" >
            {isRTL ? "الجلسات" : "Sessions" }
        </Link>
        <Link key="3" href="/patients" className="subcategory-link" >
            {isRTL ? "الحسابات" : "Accounts" }
        </Link>
        <Link key="4" href="/patients" className="subcategory-link" >
            {isRTL ? "الحجوزات" : "Appointments" }
        </Link>
        <Link key="5" href="/patients" className="subcategory-link" >
            {isRTL ? "الحجز السريع" : "Fast Appointements" }
        </Link>
        <Link key="6" href="/patients" className="subcategory-link" >
            {isRTL ? "الاستعلامات" : "Queries" }
        </Link>
        
        
        <button type="button" className="subcategory-link"
            onClick={() => toggleMenu("settings")}
        >
            <span>{isRTL ? "الاعدادات" : "Settings" }</span>
            <span className="menu-arrow">{openMenus.settings ? "▲" : "▼"  }</span>
        </button>


        

            {openMenus.settings && (
                <div className="menu-submenu" >

                    
                    <Link  href="/roles" className="menu-submenu-link"  >
                        {isRTL ? "الوظائف" : "Roles" }
                    </Link>

                    
                    <Link href="/users"   className="menu-submenu-link"  >
                        {isRTL  ? "المستخدمين"  : "Users" }
                    </Link>

                </div>)}

    </div>

</div>

);

}
export default NavBar;
*/
