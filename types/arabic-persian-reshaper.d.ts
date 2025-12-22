declare module 'arabic-persian-reshaper' {
  export namespace ArabicShaper {
    function convertArabic(str: string): string;
    function convertArabicBack(str: string): string;
  }
  export namespace PersianShaper {
    function convertPersian(str: string): string;
    function convertPersianBack(str: string): string;
  }
}
